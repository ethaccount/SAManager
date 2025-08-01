import { MAINNET_CHAIN_ID, TESTNET_CHAIN_ID } from './chains'
import ethereum from '@/assets/chains/ethereum.svg'
import polygon from '@/assets/chains/polygon.svg'
import optimism from '@/assets/chains/optimism.svg'
import arbitrum from '@/assets/chains/arbitrum-one.svg'
import base from '@/assets/chains/base.svg'

export const CHAIN_ICONS: Record<string, { icon: string; name: string }> = {
	// Mainnet
	[MAINNET_CHAIN_ID.ETHEREUM]: { icon: ethereum, name: 'Ethereum' },
	[MAINNET_CHAIN_ID.POLYGON]: { icon: polygon, name: 'Polygon' },
	[MAINNET_CHAIN_ID.OPTIMISM]: { icon: optimism, name: 'Optimism' },
	[MAINNET_CHAIN_ID.ARBITRUM]: { icon: arbitrum, name: 'Arbitrum' },
	[MAINNET_CHAIN_ID.BASE]: { icon: base, name: 'Base' },
	// Testnet
	[TESTNET_CHAIN_ID.SEPOLIA]: { icon: ethereum, name: 'Sepolia' },
	[TESTNET_CHAIN_ID.ARBITRUM_SEPOLIA]: { icon: arbitrum, name: 'Arbitrum Sepolia' },
	[TESTNET_CHAIN_ID.OPTIMISM_SEPOLIA]: { icon: optimism, name: 'Optimism Sepolia' },
	[TESTNET_CHAIN_ID.BASE_SEPOLIA]: { icon: base, name: 'Base Sepolia' },
	[TESTNET_CHAIN_ID.POLYGON_AMOY]: { icon: polygon, name: 'Polygon Amoy' },
	// Local
	[TESTNET_CHAIN_ID.LOCAL]: { icon: '', name: 'Local' },
}
