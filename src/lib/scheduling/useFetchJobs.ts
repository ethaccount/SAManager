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

	const jobs: Job[] = []

	for (let i = 1; i <= jobCount; i++) {
		const job = await scheduledTransfers.executionLog(accountAddress, i)
		const decodedExecutionData = decodeExecutionData(job.executionData)

		let tokenName = 'ETH'
		let tokenSymbol = 'ETH'
		let tokenDecimals = 18n

		if (decodedExecutionData.tokenAddress !== NATIVE_TOKEN_ADDRESS) {
			// fetch token info
			const token = TIERC20__factory.connect(decodedExecutionData.tokenAddress, client)
			tokenName = await token.name()
			tokenSymbol = await token.symbol()
			tokenDecimals = await token.decimals()
		}

		jobs.push({
			id: i,
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
