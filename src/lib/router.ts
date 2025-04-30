import { useNetwork } from '@/stores/useNetwork'

export function toRoute(name: string) {
	const { selectedChainId } = useNetwork()
	return {
		name,
		params: {
			chainId: selectedChainId.value,
		},
	}
}
