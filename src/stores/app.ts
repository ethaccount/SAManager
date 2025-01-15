import { PIMLICO_API_KEY, RPC_URL } from '@/config'
import { JsonRpcProvider } from 'ethers'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('useAppStore', () => {
	const chainId = ref('11155111')
	const client = ref(markRaw(new JsonRpcProvider(RPC_URL)))
	const bundlerUrl = computed(() => `https://api.pimlico.io/v2/${chainId.value}/rpc?apikey=${PIMLICO_API_KEY}`)

	return {
		chainId,
		client,
		bundlerUrl,
	}
})

export function useApp() {
	const appStore = useAppStore()
	return {
		...appStore,
		...storeToRefs(appStore),
	}
}
