export const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY
export const PIMLICO_API_KEY = import.meta.env.VITE_PIMLICO_API_KEY
export const PASSKEY_RP_URL = import.meta.env.VITE_PASSKEY_RP_URL
export const SALT = import.meta.env.VITE_SALT

// built-in constants: https://vite.dev/guide/env-and-mode#built-in-constants
export const IS_DEV = !import.meta.env.PROD

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

export const ERROR_NOTIFICATION_DURATION = Infinity
