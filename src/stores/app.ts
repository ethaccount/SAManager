import { JsonRpcProvider } from 'ethers'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('useAppStore', () => {
	const chainId = ref('11155111')
	const client = ref(markRaw(new JsonRpcProvider(rpcUrl)))

	return {
		chainId,
		client,
	}
})
