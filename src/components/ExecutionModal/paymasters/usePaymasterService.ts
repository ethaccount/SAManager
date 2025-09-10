import { PaymasterServiceCapability } from '@/features/account-capabilities'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { isSameAddress, PaymasterService } from 'sendop'

export function usePaymasterService() {
	const { selectedChainId, currentEntryPointAddress } = useBlockchain()

	async function checkEntryPointSupport(paymasterCapability?: PaymasterServiceCapability): Promise<boolean> {
		if (!paymasterCapability) {
			throw new Error('Invalid paymaster capability')
		}

		// check supported entrypoints
		const paymasterService = new PaymasterService(paymasterCapability.url, selectedChainId.value)
		const supportedEntryPoints = await paymasterService.supportedEntryPoints()
		if (!supportedEntryPoints.some(entryPoint => isSameAddress(entryPoint, currentEntryPointAddress.value))) {
			return false
		}
		return true
	}

	return {
		checkEntryPointSupport,
	}
}
