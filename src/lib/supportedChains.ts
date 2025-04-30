import { PIMLICO_API_KEY, ALCHEMY_API_KEY } from '@/config'

export enum CHAIN_ID {
	LOCAL = '1337',
	SEPOLIA = '11155111',
	ARBITRUM_SEPOLIA = '421614',
	OPTIMISM_SEPOLIA = '11155420',
	BASE_SEPOLIA = '84532',
}

export const DEFAULT_CHAIN_ID = CHAIN_ID.SEPOLIA

export function isSupportedChainId(chainId: string | number | bigint): chainId is CHAIN_ID {
	try {
		return Object.values(CHAIN_ID).includes(chainId.toString() as CHAIN_ID)
	} catch (error) {
		return false
	}
}

export const CHAIN_NAME: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: 'Local',
	[CHAIN_ID.SEPOLIA]: 'Sepolia',
	[CHAIN_ID.ARBITRUM_SEPOLIA]: 'Arbitrum Sepolia',
	[CHAIN_ID.OPTIMISM_SEPOLIA]: 'Optimism Sepolia',
	[CHAIN_ID.BASE_SEPOLIA]: 'Base Sepolia',
} as const

export function displayChainName(chainId: string | number | bigint): string {
	if (isSupportedChainId(chainId)) {
		return CHAIN_NAME[chainId.toString() as CHAIN_ID]
	}
	return 'Unknown'
}

export const RPC_URL: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: `http://localhost:8545`,
	[CHAIN_ID.SEPOLIA]: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
	[CHAIN_ID.ARBITRUM_SEPOLIA]: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
	[CHAIN_ID.OPTIMISM_SEPOLIA]: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
	[CHAIN_ID.BASE_SEPOLIA]: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
}

export const EXPLORER_URL: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: '',
	[CHAIN_ID.SEPOLIA]: 'https://sepolia.etherscan.io',
	[CHAIN_ID.ARBITRUM_SEPOLIA]: 'https://sepolia.arbiscan.io',
	[CHAIN_ID.OPTIMISM_SEPOLIA]: 'https://sepolia-optimism.etherscan.io',
	[CHAIN_ID.BASE_SEPOLIA]: 'https://sepolia.basescan.org',
}

export const BUNDLER_URL: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: 'http://localhost:4337',
	[CHAIN_ID.SEPOLIA]: `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`,
	[CHAIN_ID.ARBITRUM_SEPOLIA]: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
	[CHAIN_ID.OPTIMISM_SEPOLIA]: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
	[CHAIN_ID.BASE_SEPOLIA]: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
}
