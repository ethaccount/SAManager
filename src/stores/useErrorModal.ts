import { defineStore, storeToRefs } from 'pinia'

/**
 * @docs Global Error Handling
 * main.ts - app.config.errorHandler
 * App.vue - vue-final-modal useModal
 * components - ErrorModal.vue
 * pinia - useErrorModalStore
 */

type ErrorLog = {
	message: string
	timestamp: number
}

export const useErrorModalStore = defineStore('useErrorModalStore', () => {
	const errorLogs = ref<ErrorLog[]>([])
	const modal = reactive({
		open: () => {},
		close: () => {},
	})

	function logError(message: string) {
		errorLogs.value.push({
			message,
			timestamp: Date.now(),
		})
		modal.open()
	}

	function initOpenAndCloseFn(open: () => void, close: () => void) {
		modal.open = open
		modal.close = close
	}

	return { errorLogs, logError, initOpenAndCloseFn, modal }
})

export function useErrorModal() {
	const store = useErrorModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
