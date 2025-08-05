export interface Env {
	ENVIRONMENT: 'staging' | 'production'

	ALCHEMY_API_KEY: string
	PIMLICO_API_KEY: string
	ETHERSPOT_API_KEY: string
	CANDIDE_API_KEY: string
	ETHERSCAN_API_KEY: string

	BACKEND_URL: string
	API_SECRET: string

	TENDERLY_API_KEY_MAINNET: string
	TENDERLY_API_KEY_BASE: string
	TENDERLY_API_KEY_ARBITRUM: string
	TENDERLY_API_KEY_OPTIMISM: string
	TENDERLY_API_KEY_POLYGON: string

	TENDERLY_API_KEY_SEPOLIA: string
	TENDERLY_API_KEY_BASE_SEPOLIA: string
	TENDERLY_API_KEY_ARBITRUM_SEPOLIA: string
	TENDERLY_API_KEY_OPTIMISM_SEPOLIA: string
	TENDERLY_API_KEY_POLYGON_AMOY: string
}

export function validateEnv(env: Env) {
	if (!env.ENVIRONMENT) throw new Error('Missing ENVIRONMENT')

	if (!env.ALCHEMY_API_KEY) throw new Error('Missing ALCHEMY_API_KEY')
	if (!env.PIMLICO_API_KEY) throw new Error('Missing PIMLICO_API_KEY')
	if (!env.ETHERSPOT_API_KEY) throw new Error('Missing ETHERSPOT_API_KEY')
	if (!env.CANDIDE_API_KEY) throw new Error('Missing CANDIDE_API_KEY')
	if (!env.ETHERSCAN_API_KEY) throw new Error('Missing ETHERSCAN_API_KEY')

	if (!env.BACKEND_URL) throw new Error('Missing BACKEND_URL')
	if (!env.API_SECRET) throw new Error('Missing API_SECRET')

	if (env.ENVIRONMENT === 'staging') {
		if (!env.TENDERLY_API_KEY_SEPOLIA) throw new Error('Missing TENDERLY_API_KEY_SEPOLIA')
		if (!env.TENDERLY_API_KEY_OPTIMISM_SEPOLIA) throw new Error('Missing TENDERLY_API_KEY_OPTIMISM_SEPOLIA')
		if (!env.TENDERLY_API_KEY_ARBITRUM_SEPOLIA) throw new Error('Missing TENDERLY_API_KEY_ARBITRUM_SEPOLIA')
		if (!env.TENDERLY_API_KEY_BASE_SEPOLIA) throw new Error('Missing TENDERLY_API_KEY_BASE_SEPOLIA')
		if (!env.TENDERLY_API_KEY_POLYGON_AMOY) throw new Error('Missing TENDERLY_API_KEY_POLYGON_AMOY')
	}

	if (env.ENVIRONMENT === 'production') {
		if (!env.TENDERLY_API_KEY_ARBITRUM) throw new Error('Missing TENDERLY_API_KEY_ARBITRUM')
		if (!env.TENDERLY_API_KEY_BASE) throw new Error('Missing TENDERLY_API_KEY_BASE')
		// if (!env.TENDERLY_API_KEY_MAINNET) throw new Error('Missing TENDERLY_API_KEY_MAINNET')
		// if (!env.TENDERLY_API_KEY_OPTIMISM) throw new Error('Missing TENDERLY_API_KEY_OPTIMISM')
		// if (!env.TENDERLY_API_KEY_POLYGON) throw new Error('Missing TENDERLY_API_KEY_POLYGON')
	}
}
