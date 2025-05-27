import { NATIVE_TOKEN_ADDRESS } from '@/lib/token'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { AbiCoder, JsonRpcProvider } from 'ethers'
import { ADDRESS, TIERC20__factory, TScheduledTransfers__factory } from 'sendop'

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

export function decodeExecutionData(data: string) {
	const abiCoder = new AbiCoder()
	const [recipient, tokenAddress, amount] = abiCoder.decode(['address', 'address', 'uint256'], data)

	return {
		recipient,
		tokenAddress,
		amount,
	}
}

// Helper function to calculate next execution time
export function getNextExecutionTime(job: Job) {
	if (job.lastExecutionTime > 0) {
		// Calculate next execution based on last execution + interval
		const nextTime = Number(job.lastExecutionTime) + Number(job.executeInterval)
		return new Date(nextTime * 1000)
	} else {
		// First execution will be at start date
		return new Date(Number(job.startDate) * 1000)
	}
}

// Helper function to format next execution
export function formatNextExecution(job: Job) {
	const nextTime = getNextExecutionTime(job)
	if (isNaN(nextTime.getTime())) {
		return 'Invalid Date'
	}

	const now = new Date()
	const diffMs = nextTime.getTime() - now.getTime()

	if (diffMs < 0) {
		const overdueDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
		const overdueHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60))
		const overdueMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60))

		if (overdueDays > 0) {
			return `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`
		} else if (overdueHours > 0) {
			return `Overdue by ${overdueHours} hour${overdueHours > 1 ? 's' : ''}`
		} else if (overdueMinutes > 0) {
			return `Overdue by ${overdueMinutes} minute${overdueMinutes > 1 ? 's' : ''}`
		} else {
			return 'Overdue by less than a minute'
		}
	}

	const diffMinutes = Math.floor(diffMs / (1000 * 60))
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays > 0) {
		return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
	} else if (diffHours > 0) {
		return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`
	} else if (diffMinutes > 0) {
		return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`
	} else {
		return 'very soon'
	}
}

// Helper function to check if job is overdue
export function isJobOverdue(job: Job) {
	const nextTime = getNextExecutionTime(job)
	const now = new Date()
	return nextTime.getTime() < now.getTime()
}

// Helper function to format interval
export function formatInterval(interval: bigint) {
	const seconds = Number(interval)
	const days = Math.floor(seconds / 86400)
	const hours = Math.floor((seconds % 86400) / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)

	if (days > 0) return `Every ${days} day${days > 1 ? 's' : ''}`
	if (hours > 0) return `Every ${hours} hour${hours > 1 ? 's' : ''}`
	if (minutes > 0) return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`
	return `Every ${seconds} second${seconds > 1 ? 's' : ''}`
}

// Helper function to format timestamp
export function formatDate(timestamp: bigint) {
	const date = new Date(Number(timestamp) * 1000)
	if (isNaN(date.getTime())) {
		return 'Invalid Date'
	}
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}
