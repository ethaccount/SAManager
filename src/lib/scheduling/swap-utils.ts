import { Contract, getAddress, Interface, JsonRpcProvider } from 'ethers'
import { getToken, Token } from '../tokens/token'
import { CHAIN_ID } from '@/stores/blockchain/blockchain'
import { isSameAddress } from 'sendop'

export const SWAP_ROUTER = '0x65669fE35312947050C450Bd5d36e6361F85eC12'
export const UNISWAP_V3_FACTORY = '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'
export const MIN_SQRT_RATIO = 4295128739n // TickMath.MIN_SQRT_RATIO
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n // TickMath.MAX_SQRT_RATIO
export const DEFAULT_FEE = 500
export const DEFAULT_SLIPPAGE = 0.005

export type SwapParameters = {
	tokenIn: string
	tokenOut: string
	amountIn: bigint
	slippageTolerance: number
	fee: number
}

export async function getSwapParameters(
	client: JsonRpcProvider,
	swapParams: SwapParameters,
): Promise<{ sqrtPriceLimitX96: bigint; amountOutMinimum: bigint; fee: bigint }> {
	const poolAddress = await getPool(client, swapParams.tokenIn, swapParams.tokenOut, DEFAULT_FEE)

	if (!getAddress(poolAddress)) {
		throw new Error('Pool address not found')
	}

	const poolData = await getPoolData(client, poolAddress)

	// Calculate zeroForOne dynamically based on whether tokenIn is token0 or token1
	// If tokenIn is token0, then zeroForOne = true (token0 -> token1)
	// If tokenIn is token1, then zeroForOne = false (token1 -> token0)
	const zeroForOne = isSameAddress(swapParams.tokenIn, poolData.token0.address)

	// Calculate swap parameters using the utility function
	const { sqrtPriceLimitX96, amountOutMinimum } = calculateSwapParams({
		currentSqrtPriceX96: poolData.sqrtPriceX96,
		slippageTolerance: swapParams.slippageTolerance,
		amountIn: swapParams.amountIn,
		token0Decimals: poolData.token0.decimals,
		token1Decimals: poolData.token1.decimals,
		zeroForOne,
	})

	return {
		sqrtPriceLimitX96,
		amountOutMinimum,
		fee: poolData.fee,
	}
}

export const FACTORY_INTERFACE = new Interface([
	'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)',
])

export async function getPool(
	client: JsonRpcProvider,
	tokenA: string,
	tokenB: string,
	fee: number = DEFAULT_FEE,
): Promise<string> {
	const factoryContract = new Contract(UNISWAP_V3_FACTORY, FACTORY_INTERFACE, client)
	const poolAddress = await factoryContract.getPool(tokenA, tokenB, fee)
	return poolAddress
}

export const POOL_INTERFACE = new Interface([
	'function fee() external view returns (uint24)',
	'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
	'function token0() external view returns (address)',
	'function token1() external view returns (address)',
])

export async function getPoolData(
	client: JsonRpcProvider,
	poolAddress: string,
): Promise<{
	fee: bigint
	sqrtPriceX96: bigint
	token0: Token
	token1: Token
}> {
	const poolContract = new Contract(poolAddress, POOL_INTERFACE, client)

	const [fee, slot0, token0Address, token1Address] = await Promise.all([
		poolContract.fee(),
		poolContract.slot0(),
		poolContract.token0(),
		poolContract.token1(),
	])

	const network = await client.getNetwork()
	const chainId = network.chainId.toString() as CHAIN_ID

	const token0 = getToken(chainId, token0Address)
	const token1 = getToken(chainId, token1Address)

	if (!token0) {
		throw new Error(`Token ${token0Address} not found locally`)
	}

	if (!token1) {
		throw new Error(`Token ${token1Address} not found locally`)
	}

	return {
		fee,
		sqrtPriceX96: slot0[0] as bigint,
		token0,
		token1,
	}
}

/**
 * Calculate swap parameters for Uniswap v3 swaps
 * @param currentSqrtPriceX96 Current pool sqrt price
 * @param slippageTolerance Slippage tolerance (0.01 = 1%)
 * @param amountIn Input amount in wei/smallest unit
 * @param token0Decimals Decimals of token0
 * @param token1Decimals Decimals of token1
 * @param zeroForOne True if swapping token0 for token1, false if swapping token1 for token0
 * @returns Object with sqrtPriceLimitX96 and amountOutMinimum
 */
export function calculateSwapParams({
	currentSqrtPriceX96,
	slippageTolerance,
	amountIn,
	token0Decimals,
	token1Decimals,
	zeroForOne,
}: {
	currentSqrtPriceX96: bigint
	slippageTolerance: number
	amountIn: bigint
	token0Decimals: number
	token1Decimals: number
	zeroForOne: boolean
}): {
	sqrtPriceLimitX96: bigint
	amountOutMinimum: bigint
} {
	// Calculate current price (token0 per token1)
	const currentPrice = calcPrice(currentSqrtPriceX96, token0Decimals, token1Decimals)

	let expectedAmountOut: number
	let sqrtPriceLimitX96: bigint
	let outputDecimals: number

	if (zeroForOne) {
		// Swapping token0 for token1
		// Calculate expected token1 output
		const amountInFloat = Number(amountIn) / Math.pow(10, token0Decimals)
		expectedAmountOut = amountInFloat * currentPrice
		outputDecimals = token1Decimals

		// For zeroForOne, we want a lower price limit (less favorable)
		// This means accepting less token1 per token0
		const minAcceptablePrice = currentPrice * (1 - slippageTolerance)
		sqrtPriceLimitX96 = calcSqrtPriceX96(minAcceptablePrice, token0Decimals, token1Decimals)

		// Validate: must be < current price AND > MIN_SQRT_RATIO
		if (sqrtPriceLimitX96 <= MIN_SQRT_RATIO) {
			throw new Error(
				`sqrtPriceLimitX96 ${sqrtPriceLimitX96} is too low, must be > MIN_SQRT_RATIO (${MIN_SQRT_RATIO})`,
			)
		}
		if (sqrtPriceLimitX96 >= currentSqrtPriceX96) {
			throw new Error(
				`sqrtPriceLimitX96 ${sqrtPriceLimitX96} must be < current price ${currentSqrtPriceX96} for zeroForOne=true`,
			)
		}
	} else {
		// Swapping token1 for token0
		// Calculate expected token0 output
		const amountInFloat = Number(amountIn) / Math.pow(10, token1Decimals)
		expectedAmountOut = amountInFloat / currentPrice
		outputDecimals = token0Decimals

		// For oneForZero, we want a higher price limit (less favorable)
		// This means accepting less token0 per token1
		const maxAcceptablePrice = currentPrice * (1 + slippageTolerance)
		sqrtPriceLimitX96 = calcSqrtPriceX96(maxAcceptablePrice, token0Decimals, token1Decimals)

		// Validate: must be > current price AND < MAX_SQRT_RATIO
		if (sqrtPriceLimitX96 >= MAX_SQRT_RATIO) {
			throw new Error(
				`sqrtPriceLimitX96 ${sqrtPriceLimitX96} is too high, must be < MAX_SQRT_RATIO (${MAX_SQRT_RATIO})`,
			)
		}
		if (sqrtPriceLimitX96 <= currentSqrtPriceX96) {
			throw new Error(
				`sqrtPriceLimitX96 ${sqrtPriceLimitX96} must be > current price ${currentSqrtPriceX96} for zeroForOne=false`,
			)
		}
	}

	// Apply slippage tolerance
	const minAmountOut = BigInt(Math.floor(expectedAmountOut / (1 + slippageTolerance)))

	// Convert to BigInt with proper decimals
	const amountOutMinimum = minAmountOut * BigInt(10 ** outputDecimals)

	return {
		sqrtPriceLimitX96,
		amountOutMinimum,
	}
}

export function calcPrice(sqrtPriceX96: bigint, token0Decimals: number, token1Decimals: number) {
	const sqrtPriceX96Number = Number(sqrtPriceX96)
	const Q96 = Math.pow(2, 96)
	const sqrtPrice = sqrtPriceX96Number / Q96
	const price = sqrtPrice * sqrtPrice
	return price * Math.pow(10, token0Decimals - token1Decimals)
}

export function calcSqrtPriceX96(price: number, token0Decimals: number, token1Decimals: number) {
	const Q96 = Math.pow(2, 96)
	const adjustedPrice = price * Math.pow(10, token1Decimals - token0Decimals)
	const sqrtPrice = Math.sqrt(adjustedPrice)
	return BigInt(Math.floor(sqrtPrice * Q96))
}
