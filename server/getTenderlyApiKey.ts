import { Env } from './env'

export function getTenderlyApiKey(chainId: number, env: Env): string | null {
	switch (chainId) {
		// Mainnet
		case 1:
			return env.TENDERLY_API_KEY_MAINNET
		case 8453:
			return env.TENDERLY_API_KEY_BASE
		case 42161:
			return env.TENDERLY_API_KEY_ARBITRUM
		case 10:
			return env.TENDERLY_API_KEY_OPTIMISM
		case 137:
			return env.TENDERLY_API_KEY_POLYGON

		// Testnet
		case 11155111:
			return env.TENDERLY_API_KEY_SEPOLIA
		case 11155420:
			return env.TENDERLY_API_KEY_OPTIMISM_SEPOLIA
		case 421614:
			return env.TENDERLY_API_KEY_ARBITRUM_SEPOLIA
		case 84532:
			return env.TENDERLY_API_KEY_BASE_SEPOLIA
		case 80002:
			return env.TENDERLY_API_KEY_POLYGON_AMOY
		default:
			return null
	}
}
