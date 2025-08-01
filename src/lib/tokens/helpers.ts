import { IERC20__factory, isSameAddress } from 'sendop'
import { formatUnits } from 'ethers'
import { getToken, NATIVE_TOKEN_ADDRESS } from './token'
import type { CHAIN_ID } from '@/stores/blockchain/chains'
import type { JsonRpcProvider } from 'ethers'

export interface TokenBalanceCheckParams {
	client: JsonRpcProvider
	accountAddress: string
	tokenAddress: string
	requiredAmount: bigint
	chainId: CHAIN_ID
}

/**
 * Check if an account has sufficient token balance
 * @param params - Token balance check parameters
 * @throws Error if insufficient balance
 * @returns The current balance
 */
export async function checkTokenBalance(params: TokenBalanceCheckParams): Promise<bigint> {
	const { client, accountAddress, tokenAddress, requiredAmount, chainId } = params

	const token = getToken(chainId, tokenAddress)
	if (!token) {
		throw new Error(`Token information not found for ${tokenAddress}`)
	}

	let balance: bigint
	if (isSameAddress(tokenAddress, NATIVE_TOKEN_ADDRESS)) {
		// Native token balance
		balance = await client.getBalance(accountAddress)
	} else {
		// ERC20 token balance
		const tokenContract = IERC20__factory.connect(tokenAddress, client)
		balance = await tokenContract.balanceOf(accountAddress)
	}

	if (balance < requiredAmount) {
		throw new Error(
			`Insufficient balance. Required: ${formatUnits(requiredAmount, token.decimals)} ${token.symbol}, ` +
				`Available: ${formatUnits(balance, token.decimals)} ${token.symbol}`,
		)
	}

	return balance
}
