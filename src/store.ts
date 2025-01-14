import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
	const chainId = ref('11155111')

	return {
		chainId,
	}
})
