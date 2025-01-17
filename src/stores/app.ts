import { CHAIN_ID, PIMLICO_API_KEY, RPC_URL } from '@/config'
import { JsonRpcProvider } from 'ethers'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { PimlicoBundler } from '@/core/bundler'

export const useAppStore = defineStore('useAppStore', () => {
	const chainId = ref<CHAIN_ID>(CHAIN_ID.SEPOLIA)

	const bundlerUrl = computed(() => `https://api.pimlico.io/v2/${chainId.value}/rpc?apikey=${PIMLICO_API_KEY}`)
	const client = computed(() => {
		return new JsonRpcProvider(RPC_URL)
	})
	const bundler = computed(() => {
		return new PimlicoBundler(bundlerUrl.value, chainId.value)
	})

	const setChainId = (id: CHAIN_ID) => {
		chainId.value = id
	}

	return {
		chainId,
		client,
		bundlerUrl,
		bundler,
		setChainId,
	}
})

export function useApp() {
	const appStore = useAppStore()
	return {
		...appStore,
		...storeToRefs(appStore),
	}
}
