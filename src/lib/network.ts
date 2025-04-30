import { EntryPointVersion } from 'sendop'

export enum CHAIN_ID {
	LOCAL = '1337',
	SEPOLIA = '11155111',
	ARBITRUM_SEPOLIA = '421614',
	OPTIMISM_SEPOLIA = '11155420',
	BASE_SEPOLIA = '84532',
	POLYGON_AMOY = '80002',
}

export const CHAIN_NAME: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: 'Local',
	[CHAIN_ID.SEPOLIA]: 'Sepolia',
	[CHAIN_ID.ARBITRUM_SEPOLIA]: 'Arbitrum Sepolia',
	[CHAIN_ID.OPTIMISM_SEPOLIA]: 'Optimism Sepolia',
	[CHAIN_ID.BASE_SEPOLIA]: 'Base Sepolia',
	[CHAIN_ID.POLYGON_AMOY]: 'Polygon Amoy',
} as const

export const EXPLORER_URL: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: 'http://localhost:3000',
	[CHAIN_ID.SEPOLIA]: 'https://sepolia.etherscan.io',
	[CHAIN_ID.ARBITRUM_SEPOLIA]: 'https://sepolia.arbiscan.io',
	[CHAIN_ID.OPTIMISM_SEPOLIA]: 'https://sepolia-optimism.etherscan.io',
	[CHAIN_ID.BASE_SEPOLIA]: 'https://sepolia.basescan.org',
	[CHAIN_ID.POLYGON_AMOY]: 'https://amoy.polygonscan.com',
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

export function isSupportedChainId(chainId: string | number | bigint): chainId is CHAIN_ID {
	try {
		return Object.values(CHAIN_ID).includes(chainId.toString() as CHAIN_ID)
	} catch (error) {
		return false
	}
}

export function displayChainName(chainId: string | number | bigint): string {
	if (isSupportedChainId(chainId)) {
		return CHAIN_NAME[chainId.toString() as CHAIN_ID]
	}
	return 'Unknown'
}
