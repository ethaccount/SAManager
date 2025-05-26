import { JsonRpcProvider } from 'ethers'
import { ADDRESS, TScheduledTransfers__factory } from 'sendop'

export type Job = {
	id: number
	executeInterval: bigint
	numberOfExecutions: bigint
	numberOfExecutionsCompleted: bigint
	startDate: bigint
	isEnabled: boolean
	lastExecutionTime: bigint
	executionData: string
}

export async function fetchJobs(client: JsonRpcProvider, accountAddress: string) {
	const scheduledTransfers = TScheduledTransfers__factory.connect(ADDRESS.ScheduledTransfers, client)

	const jobCount = await scheduledTransfers.accountJobCount(accountAddress)

	const jobs: Job[] = []
	for (let i = 1; i <= jobCount; i++) {
		const job = await scheduledTransfers.executionLog(accountAddress, i)
		jobs.push({
			id: i,
			...job,
		})
	}

	return jobs
}
