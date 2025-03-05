export const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY
export const PIMLICO_API_KEY = import.meta.env.VITE_PIMLICO_API_KEY
export const PASSKEY_RP_URL = import.meta.env.VITE_PASSKEY_RP_URL

if (!ALCHEMY_API_KEY || !PIMLICO_API_KEY) {
	throw new Error('ALCHEMY_API_KEY or PIMLICO_API_KEY is not set')
}

if (!PASSKEY_RP_URL) {
	throw new Error('PASSKEY_RP_URL is not set')
}

// supported chain ids in the app
export enum CHAIN_ID {
	LOCAL = '1337',
	SEPOLIA = '11155111',
	MEKONG = '7078815900',
}

export const CHAIN_NAME: { [key: string]: keyof typeof CHAIN_ID } = {
	[CHAIN_ID.LOCAL]: 'LOCAL',
	[CHAIN_ID.SEPOLIA]: 'SEPOLIA',
	[CHAIN_ID.MEKONG]: 'MEKONG',
} as const

export const RPC_URL: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: `http://localhost:8545`,
	[CHAIN_ID.SEPOLIA]: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
	[CHAIN_ID.MEKONG]: `https://rpc.mekong.ethpandaops.io`,
}

/**
 * The URL should not end with a "/"
 */
export const EXPLORER_URL: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: '',
	[CHAIN_ID.SEPOLIA]: 'https://scope.sh/11155111',
	[CHAIN_ID.MEKONG]: `https://explorer.mekong.ethpandaops.io`,
}

export const BUNDLER_URL: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: 'http://localhost:4337',
	[CHAIN_ID.SEPOLIA]: `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`,
	[CHAIN_ID.MEKONG]: `https://api.pimlico.io/v2/mekong/rpc?apikey=${PIMLICO_API_KEY}`,
}

export const SALT = '0x0000000000000000000000000000000000000000000000000000000000000024'
export const ERROR_NOTIFICATION_DURATION = -1
