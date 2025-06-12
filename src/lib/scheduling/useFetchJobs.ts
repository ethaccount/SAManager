import { NATIVE_TOKEN_ADDRESS } from '@/lib/token'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { JsonRpcProvider } from 'ethers'
import { ADDRESS, TIERC20__factory, TScheduledTransfers__factory } from 'sendop'
import { decodeExecutionData } from './jobs'

export type Job = {
	id: number
	executeInterval: bigint
	numberOfExecutions: bigint
	numberOfExecutionsCompleted: bigint
	startDate: bigint
	isEnabled: boolean
	lastExecutionTime: bigint
	executionData: string
	recipient: string
	tokenAddress: string
	amount: bigint
	tokenName: string
	tokenSymbol: string
	tokenDecimals: bigint
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
			jobs.value = await fetchJobs(client.value, selectedAccount.value.address)
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

export async function fetchJobs(client: JsonRpcProvider, accountAddress: string) {
	const scheduledTransfers = TScheduledTransfers__factory.connect(ADDRESS.ScheduledTransfers, client)

	const jobCount = await scheduledTransfers.accountJobCount(accountAddress)

	if (jobCount === 0n) return []

	// Batch fetch all execution logs
	const executionLogPromises = Array.from({ length: Number(jobCount) }, (_, i) =>
		scheduledTransfers.executionLog(accountAddress, i + 1),
	)

	const executionLogs = await Promise.all(executionLogPromises)

	// Decode all execution data and collect unique token addresses
	const decodedExecutionDataList = executionLogs.map(job => decodeExecutionData(job.executionData))
	const uniqueTokenAddresses = new Set(
		decodedExecutionDataList.map(data => data.tokenAddress).filter(address => address !== NATIVE_TOKEN_ADDRESS),
	)

	// Batch fetch token info for all unique non-native tokens
	const tokenInfoMap = new Map<string, { name: string; symbol: string; decimals: bigint }>()

	if (uniqueTokenAddresses.size > 0) {
		const tokenInfoPromises = Array.from(uniqueTokenAddresses).map(async tokenAddress => {
			const token = TIERC20__factory.connect(tokenAddress, client)
			const [name, symbol, decimals] = await Promise.all([token.name(), token.symbol(), token.decimals()])
			return { tokenAddress, name, symbol, decimals }
		})

		const tokenInfoResults = await Promise.all(tokenInfoPromises)
		tokenInfoResults.forEach(({ tokenAddress, name, symbol, decimals }) => {
			tokenInfoMap.set(tokenAddress, { name, symbol, decimals })
		})
	}

	// Build final jobs array
	const jobs: Job[] = []
	for (let i = 0; i < executionLogs.length; i++) {
		const job = executionLogs[i]
		const decodedExecutionData = decodedExecutionDataList[i]

		let tokenName = 'ETH'
		let tokenSymbol = 'ETH'
		let tokenDecimals = 18n

		if (decodedExecutionData.tokenAddress !== NATIVE_TOKEN_ADDRESS) {
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
			...decodedExecutionData,
			tokenName,
			tokenSymbol,
			tokenDecimals,
		})
	}

	return jobs
}
