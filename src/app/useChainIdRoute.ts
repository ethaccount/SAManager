import { CHAIN_ID, DEFAULT_CHAIN_ID, isSupportedChainId } from '@/lib/network'
import { useNetwork } from '@/stores/useNetwork'
import { useRouter } from 'vue-router'

export function useChainIdRoute() {
	const router = useRouter()
	const { chainId } = useNetwork()

	const urlChainId = window.location.pathname.split('/')[1]

	if (isSupportedChainId(urlChainId)) {
		chainId.value = urlChainId as CHAIN_ID
	} else {
		router.replace({ path: `/${DEFAULT_CHAIN_ID}` })
		chainId.value = DEFAULT_CHAIN_ID
	}

	watch(chainId, () => {
		router.replace({ params: { chainId: chainId.value } })
	})
}
