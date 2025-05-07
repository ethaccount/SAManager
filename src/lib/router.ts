import { useNetwork } from '@/stores/network/useNetwork'

export function toRoute(name: string, params?: Record<string, string>) {
	const { selectedChainId } = useNetwork()
	return {
		name,
		params: {
			chainId: selectedChainId.value,
			...params,
		},
	}
}
