import { EntryPointVersion } from 'sendop'

export type CHAIN_ID = MAINNET_CHAIN_ID | TESTNET_CHAIN_ID

export enum MAINNET_CHAIN_ID {
	ETHEREUM = '1',
	POLYGON = '137',
	OPTIMISM = '10',
	ARBITRUM = '42161',
	BASE = '8453',
}

export enum TESTNET_CHAIN_ID {
	LOCAL = '1337',
	SEPOLIA = '11155111',
	ARBITRUM_SEPOLIA = '421614',
	OPTIMISM_SEPOLIA = '11155420',
	BASE_SEPOLIA = '84532',
	POLYGON_AMOY = '80002',
}

export const CHAIN_NAME: { [key: string]: string } = {
	// Mainnet
	[MAINNET_CHAIN_ID.ETHEREUM]: 'Ethereum',
	[MAINNET_CHAIN_ID.POLYGON]: 'Polygon',
	[MAINNET_CHAIN_ID.OPTIMISM]: 'Optimism',
	[MAINNET_CHAIN_ID.ARBITRUM]: 'Arbitrum',
	[MAINNET_CHAIN_ID.BASE]: 'Base',
	// Testnet
	[TESTNET_CHAIN_ID.LOCAL]: 'Local',
	[TESTNET_CHAIN_ID.SEPOLIA]: 'Sepolia',
	[TESTNET_CHAIN_ID.ARBITRUM_SEPOLIA]: 'Arbitrum Sepolia',
	[TESTNET_CHAIN_ID.OPTIMISM_SEPOLIA]: 'Optimism Sepolia',
	[TESTNET_CHAIN_ID.BASE_SEPOLIA]: 'Base Sepolia',
	[TESTNET_CHAIN_ID.POLYGON_AMOY]: 'Polygon Amoy',
} as const

export const EXPLORER_URL: { [key: string]: string } = {
	[TESTNET_CHAIN_ID.LOCAL]: 'http://localhost:3000',
	[TESTNET_CHAIN_ID.SEPOLIA]: 'https://sepolia.etherscan.io',
	[TESTNET_CHAIN_ID.ARBITRUM_SEPOLIA]: 'https://sepolia.arbiscan.io',
	[TESTNET_CHAIN_ID.OPTIMISM_SEPOLIA]: 'https://sepolia-optimism.etherscan.io',
	[TESTNET_CHAIN_ID.BASE_SEPOLIA]: 'https://sepolia.basescan.org',
	[TESTNET_CHAIN_ID.POLYGON_AMOY]: 'https://amoy.polygonscan.com',
}

export enum SUPPORTED_NODE {
	ALCHEMY = 'ALCHEMY',
	PUBLIC_NODE = 'PUBLIC_NODE',
}

export enum SUPPORTED_BUNDLER {
	PIMLICO = 'PIMLICO',
	ALCHEMY = 'ALCHEMY',
}

export type SUPPORTED_ENTRY_POINT = EntryPointVersion

export function isSupportedChainId(chainId: string | number | bigint): chainId is TESTNET_CHAIN_ID | MAINNET_CHAIN_ID {
	try {
		return Object.values({ ...TESTNET_CHAIN_ID, ...MAINNET_CHAIN_ID }).includes(
			chainId.toString() as TESTNET_CHAIN_ID | MAINNET_CHAIN_ID,
		)
	} catch {
		return false
	}
}

export function displayChainName(chainId: string | number | bigint): string {
	if (isSupportedChainId(chainId)) {
		return CHAIN_NAME[chainId.toString()]
	}
	return 'Unknown'
}

export function isTestnet(chainId: string): boolean {
	return Object.values(TESTNET_CHAIN_ID).includes(chainId as TESTNET_CHAIN_ID)
}
