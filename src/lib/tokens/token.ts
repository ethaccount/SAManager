import { CHAIN_ID, TESTNET_CHAIN_ID } from '@/stores/blockchain/blockchain'
import { getAddress } from 'ethers'

export type Token = {
	symbol: string
	name: string
	icon: string
	address: string
	decimals: number
}

export type TokenTransfer = {
	recipient: string
	amount: string
	tokenAddress: string
}

export const NATIVE_TOKEN_ADDRESS = getAddress('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')
export const SAM_TOKEN_ADDRESS = getAddress('0xef26611a6f2cb9f2f6234F4635d98a7094c801Ce')

// Base token metadata (without addresses)
const BASE_TOKEN_METADATA = {
	NATIVE: {
		symbol: 'ETH',
		name: 'Ethereum',
		icon: 'Ξ',
		decimals: 18,
	},
	WETH: {
		symbol: 'WETH',
		name: 'Wrapped Ether',
		icon: 'Ξ',
		decimals: 18,
	},
	SAM: {
		symbol: 'SAM',
		name: 'SAManager',
		icon: '💠',
		decimals: 18,
	},
	USDC: {
		symbol: 'USDC',
		name: 'USD Coin',
		icon: '$',
		decimals: 6,
	},
} as const

// Chain-specific token addresses
const CHAIN_TOKEN_ADDRESSES = {
	[TESTNET_CHAIN_ID.SEPOLIA]: {
		NATIVE: NATIVE_TOKEN_ADDRESS,
		SAM: SAM_TOKEN_ADDRESS,
		WETH: getAddress('0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'),
		USDC: getAddress('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'),
	},
	[TESTNET_CHAIN_ID.ARBITRUM_SEPOLIA]: {
		NATIVE: NATIVE_TOKEN_ADDRESS,
		SAM: SAM_TOKEN_ADDRESS,
		WETH: getAddress('0x2836ae2eA2c013acD38028fD0C77B92cccFa2EE4'),
		USDC: getAddress('0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'),
	},
	[TESTNET_CHAIN_ID.OPTIMISM_SEPOLIA]: {
		NATIVE: NATIVE_TOKEN_ADDRESS,
		SAM: SAM_TOKEN_ADDRESS,
		WETH: getAddress('0x4200000000000000000000000000000000000006'),
	},
	[TESTNET_CHAIN_ID.BASE_SEPOLIA]: {
		NATIVE: NATIVE_TOKEN_ADDRESS,
		SAM: SAM_TOKEN_ADDRESS,
		WETH: getAddress('0x1BDD24840e119DC2602dCC587Dd182812427A5Cc'),
		USDC: getAddress('0x036CbD53842c5426634e7929541eC2318f3dCF7e'),
	},
	[TESTNET_CHAIN_ID.POLYGON_AMOY]: {
		NATIVE: NATIVE_TOKEN_ADDRESS,
		SAM: SAM_TOKEN_ADDRESS,
		WETH: getAddress('0x52eF3d68BaB452a294342DC3e5f464d7f610f72E'),
	},
} as const

/**
 * Nested token registry organized by chain and token address
 * Structure: {
 *   [chainId: string]: {
 *     [tokenAddress: string]: Token
 *   }
 * }
 *
 * Example:
 * {
 *   "11155111": { // Sepolia chain ID
 *     "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": {
 *       symbol: "ETH",
 *       name: "Ethereum",
 *       icon: "Ξ",
 *       decimals: 18,
 *       address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
 *     },
 *     "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14": {
 *       symbol: "WETH",
 *       name: "Wrapped Ether",
 *       icon: "Ξ",
 *       decimals: 18,
 *       address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
 *     }
 *   }
 * }
 */
export const tokens: Record<string, Record<string, Token>> = Object.entries(CHAIN_TOKEN_ADDRESSES).reduce(
	(acc, [chainId, tokenAddresses]) => {
		acc[chainId] = Object.entries(tokenAddresses).reduce(
			(chainTokens, [tokenKey, address]) => {
				const metadata = BASE_TOKEN_METADATA[tokenKey as keyof typeof BASE_TOKEN_METADATA]
				chainTokens[address] = {
					...metadata,
					address,
				}
				return chainTokens
			},
			{} as Record<string, Token>,
		)
		return acc
	},
	{} as Record<string, Record<string, Token>>,
)

export function getTokenBySymbol(chainId: CHAIN_ID, symbol: string): Token | undefined {
	return Object.values(tokens[chainId] || {}).find(token => token.symbol === symbol)
}

export function getTokenAddress(chainId: CHAIN_ID, symbol: string): string | undefined {
	return getTokenBySymbol(chainId, symbol)?.address
}

export function getTokens(chainId: CHAIN_ID): Token[] {
	return Object.values(tokens[chainId] || {})
}

export function getToken(chainId: CHAIN_ID, address: string): Token | undefined {
	try {
		const normalizedAddress = getAddress(address)
		return tokens[chainId]?.[normalizedAddress]
	} catch {
		return undefined
	}
}
