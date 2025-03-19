export const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY
export const PIMLICO_API_KEY = import.meta.env.VITE_PIMLICO_API_KEY
export const PASSKEY_RP_URL = import.meta.env.VITE_PASSKEY_RP_URL
export const SALT = import.meta.env.VITE_SALT

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}

if (!PASSKEY_RP_URL) {
	throw new Error('PASSKEY_RP_URL is not set')
}

if (!SALT) {
	throw new Error('SALT is not set')
}

// supported chain ids in the app
export enum CHAIN_ID {
	LOCAL = '1337',
	SEPOLIA = '11155111',
}

export const CHAIN_NAME: { [key: string]: keyof typeof CHAIN_ID } = {
	[CHAIN_ID.LOCAL]: 'LOCAL',
	[CHAIN_ID.SEPOLIA]: 'SEPOLIA',
} as const

export const RPC_URL: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: `http://localhost:8545`,
	[CHAIN_ID.SEPOLIA]: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
}

/**
 * The URL should not end with a "/"
 */
export const EXPLORER_URL: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: '',
	[CHAIN_ID.SEPOLIA]: 'https://scope.sh/11155111',
}

export const BUNDLER_URL: { [key: string]: string } = {
	[CHAIN_ID.LOCAL]: 'http://localhost:4337',
	[CHAIN_ID.SEPOLIA]: `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`,
}

export const ERROR_NOTIFICATION_DURATION = -1
