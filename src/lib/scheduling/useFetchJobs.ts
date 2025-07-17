import { getToken, NATIVE_TOKEN_ADDRESS, Token } from '@/lib/tokens/token'
import { useAccount } from '@/stores/account/useAccount'
import type { CHAIN_ID } from '@/stores/blockchain/blockchain'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { JsonRpcProvider } from 'ethers'
import { ADDRESS, isSameAddress, IERC20__factory, ScheduledOrders__factory, ScheduledTransfers__factory } from 'sendop'
import { decodeSwapExecutionData, decodeTransferExecutionData } from './jobs'

export type TransferJobDetails = {
	recipient: string
	tokenAddress: string
	amount: bigint
	tokenName: string
	tokenSymbol: string
	tokenDecimals: bigint
}

export type SwapJobDetails = {
	tokenIn: string
	tokenOut: string
	amountIn: bigint
	tokenInInfo: Token
	tokenOutInfo: Token
}

export type Job = {
	id: number
	executeInterval: bigint
	numberOfExecutions: bigint
	numberOfExecutionsCompleted: bigint
	startDate: bigint
	isEnabled: boolean
	lastExecutionTime: bigint
	executionData: string
	type: 'transfer' | 'swap'
	details: TransferJobDetails | SwapJobDetails
}

export function useFetchJobs() {
	const { client } = useBlockchain()
	const { selectedAccount } = useAccount()

	const loading = ref(false)
	const error = ref<string | null>(null)
	const jobs = ref<Job[]>([])

	async function fetchAccountJobs() {
		error.value = null
		jobs.value = []

		if (!selectedAccount.value) return

		try {
			loading.value = true
			const [transferJobs, swapJobs] = await Promise.all([
				fetchTransferJobs(client.value, selectedAccount.value.address),
				fetchSwapJobs(client.value, selectedAccount.value.address),
			])
			jobs.value = [...transferJobs, ...swapJobs]
		} catch (err) {
			console.error(err)
			error.value = err instanceof Error ? err.message : String(err)
		} finally {
			loading.value = false
		}
	}

	return {
		fetchAccountJobs,
		loading,
		error,
		jobs,
	}
}

// Contract interface for job fetching
interface JobContract {
	accountJobCount(accountAddress: string): Promise<bigint>
	executionLog(
		accountAddress: string,
		jobId: number,
	): Promise<{
		executeInterval: bigint
		numberOfExecutions: bigint
		numberOfExecutionsCompleted: bigint
		startDate: bigint
		isEnabled: boolean
		lastExecutionTime: bigint
		executionData: string
	}>
}

// Utility function to get job count from contract
export async function getJobCount(contract: JobContract, accountAddress: string): Promise<bigint> {
	return await contract.accountJobCount(accountAddress)
}

// Utility function to batch fetch execution logs
export async function fetchExecutionLogs(contract: JobContract, accountAddress: string, jobCount: number) {
	const executionLogPromises = Array.from({ length: jobCount }, (_, i) =>
		contract.executionLog(accountAddress, i + 1),
	)
	return await Promise.all(executionLogPromises)
}

// Utility function to extract unique token addresses from decoded data
function extractUniqueTokenAddresses<T>(decodedDataList: T[], extractTokens: (data: T) => string[]): Set<string> {
	return new Set(
		decodedDataList
			.flatMap(extractTokens)
			.filter(
				address =>
					!isSameAddress(address, NATIVE_TOKEN_ADDRESS) &&
					!isSameAddress(address, '0x0000000000000000000000000000000000000000'),
			),
	)
}

// Utility function to build token info map
async function buildTokenInfoMap(
	uniqueTokenAddresses: Set<string>,
	chainId: CHAIN_ID,
	client: JsonRpcProvider,
): Promise<Map<string, { name: string; symbol: string; decimals: bigint }>> {
	const tokenInfoMap = new Map<string, { name: string; symbol: string; decimals: bigint }>()
	const tokensToFetchFromBlockchain = new Set<string>()

	// Check local token registry first
	for (const tokenAddress of uniqueTokenAddresses) {
		const localToken = getToken(chainId, tokenAddress)
		if (localToken) {
			tokenInfoMap.set(tokenAddress, {
				name: localToken.name,
				symbol: localToken.symbol,
				decimals: BigInt(localToken.decimals),
			})
		} else {
			tokensToFetchFromBlockchain.add(tokenAddress)
		}
	}

	// Batch fetch token info from blockchain for remaining tokens
	if (tokensToFetchFromBlockchain.size > 0) {
		const tokenInfoPromises = Array.from(tokensToFetchFromBlockchain).map(async tokenAddress => {
			const token = IERC20__factory.connect(tokenAddress, client)
			const [name, symbol, decimals] = await Promise.all([token.name(), token.symbol(), token.decimals()])
			return { tokenAddress, name, symbol, decimals }
		})

		const tokenInfoResults = await Promise.all(tokenInfoPromises)
		tokenInfoResults.forEach(({ tokenAddress, name, symbol, decimals }) => {
			tokenInfoMap.set(tokenAddress, { name, symbol, decimals })
		})
	}

	return tokenInfoMap
}

// Utility function to get default native token info
function getNativeTokenInfo() {
	return { name: 'ETH', symbol: 'ETH', decimals: 18n }
}

// Utility function to check if address is native token
function isNativeToken(address: string): boolean {
	return (
		isSameAddress(address, NATIVE_TOKEN_ADDRESS) ||
		isSameAddress(address, '0x0000000000000000000000000000000000000000')
	)
}

export async function fetchTransferJobs(client: JsonRpcProvider, accountAddress: string) {
	const scheduledTransfers = ScheduledTransfers__factory.connect(ADDRESS.ScheduledTransfers, client)

	const jobCount = await getJobCount(scheduledTransfers, accountAddress)
	if (jobCount === 0n) return []

	// Get network info to determine chainId
	const network = await client.getNetwork()
	const chainId = network.chainId.toString() as CHAIN_ID

	// Batch fetch all execution logs
	const executionLogs = await fetchExecutionLogs(scheduledTransfers, accountAddress, Number(jobCount))

	// Decode all execution data and collect unique token addresses
	const decodedExecutionDataList = executionLogs.map(job => decodeTransferExecutionData(job.executionData))
	const uniqueTokenAddresses = extractUniqueTokenAddresses(decodedExecutionDataList, data => [data.tokenAddress])

	// Build token info map
	const tokenInfoMap = await buildTokenInfoMap(uniqueTokenAddresses, chainId, client)

	// Build final jobs array
	const jobs: Job[] = []
	for (let i = 0; i < executionLogs.length; i++) {
		const job = executionLogs[i]
		const decodedExecutionData = decodedExecutionDataList[i]

		const nativeTokenInfo = getNativeTokenInfo()
		let tokenName = nativeTokenInfo.name
		let tokenSymbol = nativeTokenInfo.symbol
		let tokenDecimals = nativeTokenInfo.decimals

		if (!isNativeToken(decodedExecutionData.tokenAddress)) {
			const tokenInfo = tokenInfoMap.get(decodedExecutionData.tokenAddress)
			if (tokenInfo) {
				tokenName = tokenInfo.name
				tokenSymbol = tokenInfo.symbol
				tokenDecimals = tokenInfo.decimals
			}
		}

		jobs.push({
			id: i + 1,
			executeInterval: job.executeInterval,
			numberOfExecutions: job.numberOfExecutions,
			numberOfExecutionsCompleted: job.numberOfExecutionsCompleted,
			startDate: job.startDate,
			isEnabled: job.isEnabled,
			lastExecutionTime: job.lastExecutionTime,
			executionData: job.executionData,
			type: 'transfer',
			details: {
				recipient: decodedExecutionData.recipient,
				tokenAddress: decodedExecutionData.tokenAddress,
				amount: decodedExecutionData.amount,
				tokenName,
				tokenSymbol,
				tokenDecimals,
			},
		})
	}

	return jobs
}

export async function fetchSwapJobs(client: JsonRpcProvider, accountAddress: string) {
	const scheduledOrders = ScheduledOrders__factory.connect(ADDRESS.ScheduledOrders, client)

	const jobCount = await getJobCount(scheduledOrders, accountAddress)
	if (jobCount === 0n) return []

	// Get network info to determine chainId
	const network = await client.getNetwork()
	const chainId = network.chainId.toString() as CHAIN_ID

	// Batch fetch all execution logs
	const executionLogs = await fetchExecutionLogs(scheduledOrders, accountAddress, Number(jobCount))

	// Decode all execution data and filter out failed decodes while maintaining mapping
	const validJobsData: Array<{
		job: (typeof executionLogs)[0]
		decodedData: ReturnType<typeof decodeSwapExecutionData>
		originalJobId: number
	}> = []

	for (let i = 0; i < executionLogs.length; i++) {
		const job = executionLogs[i]
		try {
			const decodedData = decodeSwapExecutionData(job.executionData)
			validJobsData.push({ job, decodedData, originalJobId: i + 1 })
		} catch {
			console.log('Failed to decode swap execution data, filtering out job id:', i + 1)
		}
	}

	const decodedExecutionDataList = validJobsData.map(item => item.decodedData)

	const uniqueTokenAddresses = extractUniqueTokenAddresses(decodedExecutionDataList, data => [
		data.tokenIn,
		data.tokenOut,
	])

	// Build token info map
	const tokenInfoMap = await buildTokenInfoMap(uniqueTokenAddresses, chainId, client)

	// Build final jobs array
	const jobs: Job[] = []
	for (let i = 0; i < validJobsData.length; i++) {
		const { job, decodedData: decodedExecutionData, originalJobId } = validJobsData[i]

		// Get token info for tokenIn
		const nativeTokenInfo = getNativeTokenInfo()
		let tokenInInfo: Token
		if (isNativeToken(decodedExecutionData.tokenIn)) {
			tokenInInfo = {
				symbol: nativeTokenInfo.symbol,
				name: nativeTokenInfo.name,
				icon: 'Ξ',
				address: decodedExecutionData.tokenIn,
				decimals: Number(nativeTokenInfo.decimals),
			}
		} else {
			const localTokenIn = getToken(chainId, decodedExecutionData.tokenIn)
			if (localTokenIn) {
				tokenInInfo = localTokenIn
			} else {
				const tokenInfo = tokenInfoMap.get(decodedExecutionData.tokenIn)
				tokenInInfo = {
					symbol: tokenInfo?.symbol || 'UNKNOWN',
					name: tokenInfo?.name || 'Unknown Token',
					icon: '?',
					address: decodedExecutionData.tokenIn,
					decimals: tokenInfo ? Number(tokenInfo.decimals) : 18,
				}
			}
		}

		// Get token info for tokenOut
		let tokenOutInfo: Token
		if (isNativeToken(decodedExecutionData.tokenOut)) {
			tokenOutInfo = {
				symbol: nativeTokenInfo.symbol,
				name: nativeTokenInfo.name,
				icon: 'Ξ',
				address: decodedExecutionData.tokenOut,
				decimals: Number(nativeTokenInfo.decimals),
			}
		} else {
			const localTokenOut = getToken(chainId, decodedExecutionData.tokenOut)
			if (localTokenOut) {
				tokenOutInfo = localTokenOut
			} else {
				const tokenInfo = tokenInfoMap.get(decodedExecutionData.tokenOut)
				tokenOutInfo = {
					symbol: tokenInfo?.symbol || 'UNKNOWN',
					name: tokenInfo?.name || 'Unknown Token',
					icon: '?',
					address: decodedExecutionData.tokenOut,
					decimals: tokenInfo ? Number(tokenInfo.decimals) : 18,
				}
			}
		}

		jobs.push({
			id: originalJobId,
			executeInterval: job.executeInterval,
			numberOfExecutions: job.numberOfExecutions,
			numberOfExecutionsCompleted: job.numberOfExecutionsCompleted,
			startDate: job.startDate,
			isEnabled: job.isEnabled,
			lastExecutionTime: job.lastExecutionTime,
			executionData: job.executionData,
			type: 'swap',
			details: {
				tokenIn: decodedExecutionData.tokenIn,
				tokenOut: decodedExecutionData.tokenOut,
				amountIn: decodedExecutionData.amountIn,
				tokenInInfo,
				tokenOutInfo,
			},
		})
	}

	return jobs
}
