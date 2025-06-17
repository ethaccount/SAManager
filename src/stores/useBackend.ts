import { defineStore, storeToRefs } from 'pinia'

export const useBackendStore = defineStore('useBackendStore', () => {
	const isBackendHealthy = ref(false)

	async function checkBackendHealth() {
		try {
			const response = await fetch('/backend/health')
			if (!response.ok) {
				throw new Error('Backend service is unavailable - HTTP status: ' + response.status)
			}
			isBackendHealthy.value = true
		} catch (error: unknown) {
			console.error(
				'Backend service is unavailable - Connection failed:',
				error instanceof Error ? error.message : String(error),
			)
			isBackendHealthy.value = false
		}
	}

	return {
		isBackendHealthy,
		checkBackendHealth,
	}
})

export function useBackend() {
	const store = useBackendStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
