import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { dataSlice, isAddress } from 'ethers'
import { getBytesLength } from 'sendop'

export function useGetCode() {
	const { client } = useBlockchain()

	const code = ref('')
	const loading = ref(false)
	const error = ref<string | null>(null)

	const isSmartEOA = computed(() => {
		if (
			code.value.startsWith('0xef0100') &&
			isAddress(dataSlice(code.value, 3, 23)) &&
			getBytesLength(code.value) === 23
		) {
			return true
		}
		return false
	})

	const isDeployed = computed(() => {
		return code.value !== '0x'
	})

	async function getCode(address: string) {
		code.value = ''
		error.value = null

		try {
			loading.value = true
			code.value = await client.value.getCode(address)
		} catch (e: unknown) {
			console.error(e)
			if (e instanceof Error) {
				error.value = e.message
			} else {
				error.value = String(e)
			}
		} finally {
			loading.value = false
		}
	}

	return { code, getCode, loading, error, isSmartEOA, isDeployed }
}
