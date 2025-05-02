import { CHAIN_ID, isSupportedChainId } from '@/lib/network'
import { DEFAULT_CHAIN_ID, useNetwork } from '@/stores/useNetwork'
import { useRouter } from 'vue-router'

export function useChainIdRoute() {
	const router = useRouter()
	const { selectedChainId } = useNetwork()

	const urlChainId = window.location.pathname.split('/')[1]

	if (isSupportedChainId(urlChainId)) {
		selectedChainId.value = urlChainId as CHAIN_ID
	} else {
		// selectedChainId may be stored in localStorage
		if (selectedChainId.value) {
			router.replace({ path: `/${selectedChainId.value}` })
		} else {
			router.replace({ path: `/${DEFAULT_CHAIN_ID}` })
			selectedChainId.value = DEFAULT_CHAIN_ID
		}
	}

	watch(selectedChainId, () => {
		router.replace({ params: { chainId: selectedChainId.value } })
	})
}
