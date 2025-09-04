import { CHAIN_ID, DEFAULT_CHAIN_ID, isSupportedChainId } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useRouter } from 'vue-router'

export function useChainIdRoute() {
	const router = useRouter()
	const route = useRoute()
	const { selectedChainId } = useBlockchain()

	const urlChainId = window.location.pathname.split('/')[1]

	if (window.location.pathname === '/connect') {
		// Special case for /connect:
		// If the URL is /connect without a chainId, redirect to /:chainId/connect where chainId comes from localStorage or default.
		if (selectedChainId.value) {
			router.replace({ path: `/${selectedChainId.value}/connect` })
		} else {
			router.replace({ path: `/${DEFAULT_CHAIN_ID}/connect` })
			selectedChainId.value = DEFAULT_CHAIN_ID
		}
	} else if (isSupportedChainId(urlChainId)) {
		// Use the chainId specified in the URL
		selectedChainId.value = urlChainId as CHAIN_ID
	} else {
		if (selectedChainId.value) {
			// Use the chainId stored in localStorage
			router.replace({ path: `/${selectedChainId.value}` })
		} else {
			// Use the default chainId
			router.replace({ path: `/${DEFAULT_CHAIN_ID}` })
			selectedChainId.value = DEFAULT_CHAIN_ID
		}
	}

	watch(selectedChainId, () => {
		router.replace({ params: { chainId: selectedChainId.value } })

		// Reload page when selectedChainId changes except for the excluded routes
		const excludedRouteNames = ['browser', 'account-settings-multichain', 'connect']
		if (excludedRouteNames.includes(route.name as string)) {
			return
		}
		setTimeout(() => {
			location.reload()
		}, 100)
	})
}
