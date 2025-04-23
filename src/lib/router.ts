import { useBlockchain } from '@/stores/useBlockchain'

export function toRoute(name: string) {
	const { chainId } = useBlockchain()
	return {
		name,
		params: {
			chainId: chainId.value,
		},
	}
}
