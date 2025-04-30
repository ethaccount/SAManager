import { useNetwork } from '@/stores/useNetwork'

export function toRoute(name: string) {
	const { chainId } = useNetwork()
	return {
		name,
		params: {
			chainId: chainId.value,
		},
	}
}
