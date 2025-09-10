import { PublicPaymaster } from 'sendop'
import { SUPPORTED_PAYMASTERS } from './constants'
import { PaymasterData } from './types'
import { usePublicPaymaster } from './usePublicPaymaster'
import { useUsdcPaymaster } from './useUsdcPaymaster'

export const usePaymasterStore = defineStore('usePaymasterStore', () => {
	const isLoading = ref(false)

	const usdcPaymasterHook = useUsdcPaymaster()
	const { isUsdcPaymasterSupported, usdcPaymasterData } = usdcPaymasterHook

	const publicPaymasterHook = usePublicPaymaster()
	const { isPublicPaymasterSupported } = publicPaymasterHook

	const selectedPaymaster = ref<keyof typeof SUPPORTED_PAYMASTERS>(
		isPublicPaymasterSupported.value ? 'public' : 'none',
	)

	// Supported paymaster options
	const paymasters = computed(() => {
		const excludedPaymasters: (keyof typeof SUPPORTED_PAYMASTERS)[] = ['erc7677']

		// exclude public paymaster if not supported
		if (!isPublicPaymasterSupported.value) {
			excludedPaymasters.push('public')
		}

		// exclude USDC paymaster if not supported
		if (!isUsdcPaymasterSupported.value) {
			excludedPaymasters.push('usdc')
		}

		return Object.values(SUPPORTED_PAYMASTERS).filter(paymaster => !excludedPaymasters.includes(paymaster.id))
	})

	async function buildPaymasterData(): Promise<PaymasterData | null> {
		if (selectedPaymaster.value === 'public') {
			return {
				paymaster: await PublicPaymaster.getPaymaster(),
				paymasterData: await PublicPaymaster.getPaymasterData(),
				paymasterPostOpGasLimit: await PublicPaymaster.getPaymasterPostOpGasLimit(),
			}
		} else if (selectedPaymaster.value === 'usdc') {
			if (!usdcPaymasterData.value) {
				throw new Error('USDC paymaster data not prepared. Please sign the permit signature first.')
			}
			return usdcPaymasterData.value
		}

		return null
	}

	return {
		isLoading,
		paymasters,
		selectedPaymaster,
		buildPaymasterData,
		...usdcPaymasterHook,
		...publicPaymasterHook,
	}
})

export function usePaymaster() {
	const store = usePaymasterStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
