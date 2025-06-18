// Uniswap v3 constants
export const MIN_SQRT_RATIO = 4295128739n // TickMath.MIN_SQRT_RATIO
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n // TickMath.MAX_SQRT_RATIO

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
