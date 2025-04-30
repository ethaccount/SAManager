import type { EIP1193Provider } from '@vue-dapp/core'
import { ethers } from 'ethers'
import { defineStore } from 'pinia'

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

	return {
		provider,
		signer,
		setWallet,
		resetWallet,
	}
})

export function useEOAWallet() {
	const eoaStore = useEOAWalletStore()

	return {
		...eoaStore,
		...storeToRefs(eoaStore),
	}
}
