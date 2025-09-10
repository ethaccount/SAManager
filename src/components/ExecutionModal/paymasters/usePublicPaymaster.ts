import { computed } from 'vue'
import { useBlockchain } from '@/stores/blockchain'
import { PUBLIC_PAYMASTER_ADDRESSES, PUBLIC_PAYMASTER_SUPPORTED_BUNDLERS } from './constants'

export function usePublicPaymaster() {
	const { selectedChainId, selectedBundler } = useBlockchain()

	const isPublicPaymasterSupported = computed(() => {
		// Check if current chain supports public paymasters
		if (!(selectedChainId.value in PUBLIC_PAYMASTER_ADDRESSES)) {
			return false
		}

		// Check if current bundler supports public paymasters
		if (!PUBLIC_PAYMASTER_SUPPORTED_BUNDLERS.includes(selectedBundler.value)) {
			return false
		}

		return true
	})

	const publicPaymasterAddress = computed(() => {
		return PUBLIC_PAYMASTER_ADDRESSES[selectedChainId.value as keyof typeof PUBLIC_PAYMASTER_ADDRESSES]
	})

	return {
		isPublicPaymasterSupported,
		publicPaymasterAddress,
	}
}
