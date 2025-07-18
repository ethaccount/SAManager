import { CHAIN_ID, isSupportedChainId } from '@/stores/blockchain/blockchain'
import { DEFAULT_CHAIN_ID, useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useRouter } from 'vue-router'

export function useChainIdRoute() {
	const router = useRouter()
	const route = useRoute()
	const { selectedChainId } = useBlockchain()

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

		// Reload page when selectedChainId changes except for the excluded routes
		const excludedRouteNames = ['browser']
		if (excludedRouteNames.includes(route.name as string)) {
			return
		}
		setTimeout(() => {
			location.reload()
		}, 100)
	})
}
