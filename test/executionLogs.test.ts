import { fetchExecutionLogs, getJobCount } from '@/lib/scheduling/useFetchJobs'
import { JsonRpcProvider } from 'ethers'
import { alchemy, AlchemyChain } from 'evm-providers'
import { ADDRESS, ScheduledTransfers__factory } from 'sendop'

const alchemyApiKey = import.meta.env.VITE_TEST_ALCHEMY_API_KEY
if (!alchemyApiKey) {
	throw new Error('VITE_TEST_ALCHEMY_API_KEY is not set')
}

const chainIdNum = 84532
const client = new JsonRpcProvider(alchemy(chainIdNum as AlchemyChain, alchemyApiKey))
const ACCOUNT_ADDRESS = '0x92e25dE92b5AaE945d42077C16c0BA76B3eFC123'

describe('executionLogs', () => {
	it('should fetch scheduled transfers execution logs', async () => {
		const scheduledTransfers = ScheduledTransfers__factory.connect(ADDRESS.ScheduledTransfers, client)

		const jobCount = await getJobCount(scheduledTransfers, ACCOUNT_ADDRESS)
		if (jobCount === 0n) return []

		const executionLogs = await fetchExecutionLogs(scheduledTransfers, ACCOUNT_ADDRESS, Number(jobCount))
		executionLogs.forEach(execution => {
			console.log('interval', execution.executeInterval)
			console.log('numberOfExecutions', execution.numberOfExecutions)
			console.log('numberOfExecutionsCompleted', execution.numberOfExecutionsCompleted)
			console.log('startDate', execution.startDate)
			console.log('isEnabled', execution.isEnabled)
			console.log('lastExecutionTime', execution.lastExecutionTime)
			console.log('executionData', execution.executionData)
		})
		expect(executionLogs).toBeDefined()
	})
})
