import { getErrorMessage } from './error'

export function useLoading<T>({ fn, errorPrefix = '' }: { fn: () => Promise<T>; errorPrefix?: string }) {
	const data = ref<T | null>(null)
	const error = ref<string | null>(null)
	const isLoading = ref(false)

	async function load() {
		isLoading.value = true
		try {
			data.value = await fn()
		} catch (err) {
			error.value = errorPrefix + getErrorMessage(err)
		} finally {
			isLoading.value = false
		}
	}

	return {
		data,
		error,
		isLoading,
		load,
	}
}
