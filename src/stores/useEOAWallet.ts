import { useVueDapp, type EIP1193Provider } from '@vue-dapp/core'
import { ethers } from 'ethers'

export const useEOAWalletStore = defineStore('useEOAWalletStore', () => {
	const provider = ref<ethers.BrowserProvider | null>(null)
	const signer = ref<ethers.JsonRpcSigner | null>(null)

	async function setWallet(p: EIP1193Provider) {
		provider.value = markRaw(new ethers.BrowserProvider(p))
		signer.value = await provider.value.getSigner()
	}

	function resetWallet() {
		provider.value = null
		signer.value = null
	}

	const isEOAWalletConnected = computed(() => {
		return signer.value !== null
	})

	const { providerDetails } = useVueDapp()

	const isEOAWalletSupported = computed(() => providerDetails.value.length > 0)

	return {
		provider,
		signer,
		setWallet,
		resetWallet,
		isEOAWalletConnected,
		isEOAWalletSupported,
	}
})

export function useEOAWallet() {
	const store = useEOAWalletStore()
	const vueDapp = useVueDapp()

	return {
		...vueDapp,
		...store,
		...storeToRefs(store),
	}
}
