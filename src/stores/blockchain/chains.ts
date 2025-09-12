import { ADDRESS, EntryPointVersion } from 'sendop'

export type CHAIN_ID = MAINNET_CHAIN_ID | TESTNET_CHAIN_ID

// Reason to use string enums instead of number enums for chain ids:
// Numeric enums generate a bi-directional mapping, so Object.values includes both the keys and the values
// String enums only have a one-way mapping, so Object.values only contains the defined string values.
export enum MAINNET_CHAIN_ID {
	ETHEREUM = '1',
	BASE = '8453',
	ARBITRUM = '42161',
	OPTIMISM = '10',
	POLYGON = '137',
}

export enum TESTNET_CHAIN_ID {
	LOCAL = '1337',
	SEPOLIA = '11155111',
	BASE_SEPOLIA = '84532',
	ARBITRUM_SEPOLIA = '421614',
	OPTIMISM_SEPOLIA = '11155420',
	POLYGON_AMOY = '80002',
}

export const CHAIN_NAME: { [key in CHAIN_ID]: string } = {
	// Mainnet
	[MAINNET_CHAIN_ID.ETHEREUM]: 'Ethereum',
	[MAINNET_CHAIN_ID.BASE]: 'Base',
	[MAINNET_CHAIN_ID.ARBITRUM]: 'Arbitrum',
	[MAINNET_CHAIN_ID.OPTIMISM]: 'Optimism',
	[MAINNET_CHAIN_ID.POLYGON]: 'Polygon',
	// Testnet
	[TESTNET_CHAIN_ID.LOCAL]: 'Local',
	[TESTNET_CHAIN_ID.SEPOLIA]: 'Sepolia',
	[TESTNET_CHAIN_ID.ARBITRUM_SEPOLIA]: 'Arbitrum Sepolia',
	[TESTNET_CHAIN_ID.OPTIMISM_SEPOLIA]: 'Optimism Sepolia',
	[TESTNET_CHAIN_ID.BASE_SEPOLIA]: 'Base Sepolia',
	[TESTNET_CHAIN_ID.POLYGON_AMOY]: 'Polygon Amoy',
} as const

export const EXPLORER_URL: { [key in CHAIN_ID]: string } = {
	// Mainnet
	[MAINNET_CHAIN_ID.ETHEREUM]: 'https://etherscan.io',
	[MAINNET_CHAIN_ID.BASE]: 'https://basescan.org/',
	[MAINNET_CHAIN_ID.ARBITRUM]: 'https://arbiscan.io/',
	[MAINNET_CHAIN_ID.OPTIMISM]: 'https://optimistic.etherscan.io/',
	[MAINNET_CHAIN_ID.POLYGON]: 'https://polygonscan.com/',

	// Testnet
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
	ETHERSPOT = 'ETHERSPOT',
	CANDIDE = 'CANDIDE',
}

export type SUPPORTED_ENTRY_POINT = EntryPointVersion

export function isSupportedChainId(chainId: string): chainId is CHAIN_ID {
	return SUPPORTED_CHAIN_IDS.includes(chainId as CHAIN_ID)
}

export function displayChainName(chainId: string): string {
	if (isSupportedChainId(chainId)) {
		return CHAIN_NAME[chainId]
	}
	return `Unknown(${chainId})`
}

export function isTestnet(chainId: string): boolean {
	return Object.values(TESTNET_CHAIN_ID).includes(chainId as TESTNET_CHAIN_ID)
}

export function getEntryPointAddress(version: EntryPointVersion): string {
	switch (version) {
		case 'v0.7':
			return ADDRESS.EntryPointV07
		case 'v0.8':
			return ADDRESS.EntryPointV08
		default:
			throw new Error(`Unsupported entrypoint version: ${version}`)
	}
}

export const DEFAULT_ENTRY_POINT_VERSION: EntryPointVersion = 'v0.7'
export const DEFAULT_NODE = SUPPORTED_NODE.ALCHEMY
export const DEFAULT_BUNDLER = SUPPORTED_BUNDLER.PIMLICO
export const SUPPORTED_CHAIN_IDS = getSupportedChainIds()

function getSupportedChainIds(): CHAIN_ID[] {
	switch (import.meta.env.MODE) {
		case 'test':
		case 'staging':
			// no local dev needed
			return Object.values(TESTNET_CHAIN_ID).filter(id => id !== TESTNET_CHAIN_ID.LOCAL)
		case 'production':
			return Object.values(MAINNET_CHAIN_ID)
		default:
			throw new Error(`[getSupportedChainIds] Invalid vite mode: ${import.meta.env.MODE}`)
	}
}

// Most dapps only support SEPOLIA so we set it as default on testnet
export const DEFAULT_CHAIN_ID = import.meta.env.MODE === 'staging' ? TESTNET_CHAIN_ID.SEPOLIA : MAINNET_CHAIN_ID.BASE
export const DEFAULT_BROWSER_URL =
	import.meta.env.MODE === 'staging'
		? `https://swap.cow.fi/#/${TESTNET_CHAIN_ID.SEPOLIA}/swap/ETH/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
		: `https://swap.cow.fi/#/${MAINNET_CHAIN_ID.BASE}/swap/ETH/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
