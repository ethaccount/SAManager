import { AccountId, SUPPORTED_ACCOUNTS } from '@/stores/account/account'
import { Contract, hexlify, JsonRpcProvider, parseUnits, randomBytes } from 'ethers'
import {
	ADDRESS,
	Bundler,
	createUserOp,
	ERC7579Validator,
	formatUserOpToHex,
	getSmartSessionUseModeSignature,
	INTERFACES,
	isSameAddress,
	KernelV3Account,
	KernelValidationType,
	OperationGetter,
	NexusAccount,
	Safe7579Account,
	zeroBytes,
	Execution,
} from 'sendop'
import { calculateSwapParams } from './swap-utils'
import { getTokenAddress } from '@/lib/token'
import { CHAIN_ID } from '@/stores/blockchain/blockchain'

export type JobType = 'transfer' | 'swap'

export type SwapJobParams = {
	tokenIn: string
	tokenOut: string
	amountIn: bigint
	pool?: string
	token0Decimals?: number
	token1Decimals?: number
	zeroForOne?: boolean
	slippageTolerance?: number
	fee?: bigint
}

export async function registerJob({
	accountId,
	permissionId,
	accountAddress,
	jobId,
	client,
	bundler,
	jobType = 'transfer',
	swapParams,
}: {
	accountId: AccountId
	permissionId: string
	accountAddress: string
	jobId: bigint
	client: JsonRpcProvider
	bundler: Bundler
	jobType?: JobType
	swapParams?: SwapJobParams
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

	console.log('jobId', jobId)
	console.log('permissionId', permissionId)

	const entryPointVersion = SUPPORTED_ACCOUNTS[accountId].entryPointVersion
	console.log('entrypoint version', entryPointVersion)

	let epAddress = ''

	switch (entryPointVersion) {
		case 'v0.7':
			epAddress = ADDRESS.EntryPointV07
			break
		case 'v0.8':
			epAddress = ADDRESS.EntryPointV08
			break
		default:
			throw new Error(`Unsupported entrypoint version: ${entryPointVersion}`)
	}

	console.log('entrypoint address', epAddress)

	console.log('Permissioned user op', formatUserOpToHex(userOp))

	// Get chain ID from the client
	const network = await client.getNetwork()
	const chainId = Number(network.chainId)

	const formattedUserOp = formatUserOpToHex(userOp)

	// Register the job with the API
	const response = await fetch('/backend/jobs', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			accountAddress,
			chainId,
			jobId: Number(jobId),
			entryPoint: epAddress,
			userOperation: formattedUserOp,
			jobType,
		}),
	})

	if (!response.ok) {
		throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
	}

	const result = await response.json()

	// Check API response format
	if (result.code !== 0) {
		throw new Error(`API error: ${result.message}${result.error ? ` - ${JSON.stringify(result.error)}` : ''}`)
	}

	console.log('Job registered successfully:', result.data)

	return result.data
}

// Pool ABI for getting slot0 data
const POOL_ABI = [
	'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
]

async function getSwapParameters(
	client: JsonRpcProvider,
	swapParams: SwapJobParams,
): Promise<{ sqrtPriceLimitX96: bigint; amountOutMinimum: bigint; fee: bigint }> {
	// Default values
	const defaultPool = '0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1' // USDC-WETH pool with 500 fee
	const defaultToken0Decimals = 6 // USDC
	const defaultToken1Decimals = 18 // WETH
	const defaultSlippageTolerance = 0.005 // 0.5%
	const defaultFee = 500n

	// Use provided values or defaults
	const pool = swapParams.pool || defaultPool
	const token0Decimals = swapParams.token0Decimals || defaultToken0Decimals
	const token1Decimals = swapParams.token1Decimals || defaultToken1Decimals
	const slippageTolerance = swapParams.slippageTolerance || defaultSlippageTolerance
	const fee = swapParams.fee || defaultFee

	// Get chain ID to determine USDC address
	const network = await client.getNetwork()
	const chainId = network.chainId.toString() as CHAIN_ID
	const usdcAddress = getTokenAddress(chainId, 'USDC')

	// Calculate zeroForOne dynamically based on whether tokenIn is USDC
	// If tokenIn is USDC (token0), then zeroForOne = true (USDC -> WETH)
	// If tokenIn is WETH (token1), then zeroForOne = false (WETH -> USDC)
	const zeroForOne =
		swapParams.zeroForOne !== undefined
			? swapParams.zeroForOne
			: usdcAddress
			? isSameAddress(swapParams.tokenIn, usdcAddress)
			: false // Default to false if USDC address not found

	// Get current pool state
	const poolContract = new Contract(pool, POOL_ABI, client)
	const slot0 = await poolContract.slot0()
	const currentSqrtPriceX96 = slot0.sqrtPriceX96

	console.log(`Current sqrtPriceX96: ${currentSqrtPriceX96}`)

	// Calculate swap parameters using the utility function
	const { sqrtPriceLimitX96, amountOutMinimum } = calculateSwapParams({
		currentSqrtPriceX96,
		slippageTolerance,
		amountIn: swapParams.amountIn,
		token0Decimals,
		token1Decimals,
		zeroForOne,
	})

	console.log(`Amount in: ${swapParams.amountIn}`)
	console.log(`Amount out minimum: ${amountOutMinimum}`)
	console.log(`Sqrt price limit X96: ${sqrtPriceLimitX96}`)

	return {
		sqrtPriceLimitX96,
		amountOutMinimum,
		fee,
	}
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
