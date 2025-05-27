import { useBlockchain } from '@/stores/blockchain/useBlockchain'

export function toRoute(name: string, params?: Record<string, string>) {
	const { selectedChainId } = useBlockchain()
	return {
		name,
		params: {
			chainId: selectedChainId.value,
			...params,
		},
	}
}
