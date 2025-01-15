import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('useAppStore', () => {
	const chainId = ref('11155111')

	return {
		chainId,
	}
})
