import { ERROR_NOTIFICATION_DURATION } from '@/config'
import { PaymasterServiceCapability } from '@/features/account-capabilities'
import { getErrorMessage } from '@/lib/error'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { isSameAddress, PaymasterService } from 'sendop'
import { toast } from 'vue-sonner'

export function usePaymasterService() {
	const { selectedChainId, currentEntryPointAddress } = useBlockchain()

	async function checkEntryPointSupport(paymasterCapability?: PaymasterServiceCapability): Promise<boolean> {
		try {
			if (!paymasterCapability) {
				throw new Error('Invalid paymaster capability')
			}

			// check supported entrypoints
			const paymasterService = new PaymasterService(paymasterCapability.url, selectedChainId.value)
			const supportedEntryPoints = await paymasterService.supportedEntryPoints()
			if (!supportedEntryPoints.some(entryPoint => isSameAddress(entryPoint, currentEntryPointAddress.value))) {
				throw new Error('Paymaster service does not support the current entrypoint')
			}
			return true
		} catch (err) {
			console.error('Error checking entry point support', err)
			toast.error('Error checking entry point support: ' + getErrorMessage(err), {
				duration: ERROR_NOTIFICATION_DURATION,
			})
			return false
		}
	}

	return {
		checkEntryPointSupport,
	}
}
