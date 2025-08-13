import { EntryPointVersion } from 'sendop'
import {
	CHAIN_ID,
	MAINNET_CHAIN_ID,
	SUPPORTED_BUNDLER,
	SUPPORTED_NODE,
	TESTNET_CHAIN_ID,
} from './stores/blockchain/chains'

export const ERROR_NOTIFICATION_DURATION = Infinity
export const LOCAL_STORAGE_KEY_PREFIX = 'samanager-'
export const DISABLE_SCHEDULING = false
export const IS_PRODUCTION = import.meta.env.MODE === 'production'
export const IS_STAGING = import.meta.env.MODE === 'staging'
export const TESTNET_URL = 'https://testnet.samanager.xyz'
export const MAINNET_URL = 'https://samanager.xyz'
export const IS_SCHEDULED_SWAP_DISABLED = IS_PRODUCTION
export const DEFAULT_ENTRY_POINT_VERSION: EntryPointVersion = 'v0.7'
export const DEFAULT_NODE = SUPPORTED_NODE.ALCHEMY
export const DEFAULT_BUNDLER = SUPPORTED_BUNDLER.PIMLICO
export const SUPPORTED_MAINNET_CHAIN_IDS = [MAINNET_CHAIN_ID.ARBITRUM, MAINNET_CHAIN_ID.BASE]
export const SUPPORTED_CHAIN_IDS = getSupportedChainIds()

function getSupportedChainIds(): CHAIN_ID[] {
	switch (import.meta.env.MODE) {
		case 'staging':
			// no local dev needed
			return Object.values(TESTNET_CHAIN_ID).filter(id => id !== TESTNET_CHAIN_ID.LOCAL)
		case 'production':
			return SUPPORTED_MAINNET_CHAIN_IDS
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
