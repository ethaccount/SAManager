import { apiRegisterJob } from '@/api/backend/registerJob'
import { AccountId } from '@/lib/accounts'
import { CHAIN_ID } from '@/stores/blockchain/blockchain'
import { JsonRpcProvider } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, ERC4337Bundler, UserOpBuilder } from 'sendop'
import { ADDRESS, Execution, INTERFACES } from 'sendop'
import { buildSmartSessionExecutions } from '../userop-builder'
import { getSwapParameters, SwapParameters } from './swap-utils'

export type JobType = 'transfer' | 'swap'

export async function registerJob({
	chainId,
	accountId,
	permissionId,
	accountAddress,
	jobId,
	client,
	bundler,
	jobType = 'transfer',
	swapParams,
}: {
	chainId: CHAIN_ID
	accountId: AccountId
	permissionId: string
	accountAddress: string
	jobId: bigint
	client: JsonRpcProvider
	bundler: ERC4337Bundler
	jobType?: JobType
	swapParams?: SwapParameters
}) {
	const op = new UserOpBuilder({
		bundler,
		entryPointAddress: ENTRY_POINT_V07_ADDRESS,
		chainId,
	})

	// Get execution data based on job type
	let execution: Execution
	switch (jobType) {
		case 'swap':
			if (!swapParams) {
				throw new Error('Swap parameters are required for swap jobs')
			}

			const { sqrtPriceLimitX96, amountOutMinimum, fee } = await getSwapParameters(client, swapParams)

			execution = {
				to: ADDRESS.ScheduledOrders,
				value: 0n,
				data: INTERFACES.ScheduledOrders.encodeFunctionData('executeOrder', [
					jobId,
					sqrtPriceLimitX96,
					amountOutMinimum,
					fee,
				]),
			}
			break
		case 'transfer':
			execution = {
				to: ADDRESS.ScheduledTransfers,
				value: 0n,
				data: INTERFACES.ScheduledTransfers.encodeFunctionData('executeOrder', [jobId]),
			}
			break
		default:
			throw new Error(`Unsupported job type: ${jobType}`)
	}

	await buildSmartSessionExecutions({
		op,
		accountId,
		permissionId,
		accountAddress,
		client,
		executions: [execution],
	})

	if (!op.entryPointAddress) {
		throw new Error('[registerJob] Entry point address is not set')
	}

	return await apiRegisterJob(accountAddress, Number(chainId), jobId, op.entryPointAddress, jobType, op.hex())
}
