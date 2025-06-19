import { apiRegisterJob } from '@/api/backend/registerJob'
import { AccountId, getAccountEntryPointAddress } from '@/stores/account/account'
import { CHAIN_ID } from '@/stores/blockchain/blockchain'
import { hexlify, JsonRpcProvider, randomBytes } from 'ethers'
import {
	ADDRESS,
	Bundler,
	createUserOp,
	ERC7579Validator,
	Execution,
	getSmartSessionUseModeSignature,
	INTERFACES,
	KernelV3Account,
	KernelValidationType,
	NexusAccount,
	OperationGetter,
	Safe7579Account,
	zeroBytes,
} from 'sendop'
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
	bundler: Bundler
	jobType?: JobType
	swapParams?: SwapParameters
}) {
	const validator: ERC7579Validator = {
		address: () => ADDRESS.SmartSession,
		getDummySignature: () => '0x',
		getSignature: () => {
			return '0x'
		},
	}

	const opGetter = getModularAccountInstance({
		accountId,
		accountAddress,
		client,
		bundler,
		validator,
		isRandomNonceKey: true,
	})

	if (!opGetter) {
		throw new Error(`Unsupported account ID: ${accountId}`)
	}

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

	const userOp = await createUserOp(bundler, [execution], opGetter)

	userOp.signature = getSmartSessionUseModeSignature(permissionId, '0x')

	return await apiRegisterJob(
		accountAddress,
		Number(chainId),
		jobId,
		getAccountEntryPointAddress(accountId),
		userOp,
		jobType,
	)
}

function getModularAccountInstance({
	accountId,
	accountAddress,
	client,
	bundler,
	validator,
	isRandomNonceKey = false,
}: {
	accountId: AccountId
	accountAddress: string
	client: JsonRpcProvider
	bundler: Bundler
	validator: ERC7579Validator
	isRandomNonceKey?: boolean
}): OperationGetter | null {
	switch (accountId) {
		case 'kernel.advanced.v0.3.1':
			return new KernelV3Account({
				address: accountAddress,
				client,
				bundler,
				nonce: {
					type: KernelValidationType.VALIDATOR,
					key: isRandomNonceKey ? hexlify(randomBytes(2)) : zeroBytes(2),
				},
				validator,
			})
		case 'biconomy.nexus.1.0.2':
			return new NexusAccount({
				address: accountAddress,
				client,
				bundler,
				validator,
				nonce: {
					key: isRandomNonceKey ? hexlify(randomBytes(3)) : zeroBytes(3),
				},
			})
		case 'rhinestone.safe7579.v1.0.0':
			if (isRandomNonceKey) {
				return null
			}
			return new Safe7579Account({
				address: accountAddress,
				client,
				bundler,
				validator,
			})
		default:
			return null
	}
}
