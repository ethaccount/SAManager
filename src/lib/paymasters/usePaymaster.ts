import { PublicPaymaster } from 'sendop'
import { SUPPORTED_PAYMASTERS } from './constants'
import { PaymasterData } from './types'
import { useUsdcPaymaster } from './useUsdcPaymaster'

export function usePaymaster() {
	const usdcPaymasterHook = useUsdcPaymaster()
	const { isUsdcPaymasterSupported, usdcPaymasterData } = usdcPaymasterHook

	// state
	const selectedPaymaster = ref<keyof typeof SUPPORTED_PAYMASTERS>('public')

	const paymasters = computed(() => {
		const excludedPaymasters: (keyof typeof SUPPORTED_PAYMASTERS)[] = []

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
		paymasters,
		selectedPaymaster,
		buildPaymasterData,
		...usdcPaymasterHook,
	}
}
