import { useAccount } from '@/stores/account/useAccount'
import { standardErrors, WalletGetCapabilitiesRequest } from '@samanager/sdk'
import { isSameAddress } from 'node_modules/sendop/dist/src/utils/ethers-helper'

export function handleGetCapabilities(params: WalletGetCapabilitiesRequest['params']) {
	const [address, chainIds] = params

	// Validate connection
	if (address) {
		const { selectedAccount } = useAccount()
		if (!selectedAccount.value) {
			throw standardErrors.provider.unauthorized('No account selected')
		}
		if (!isSameAddress(address, selectedAccount.value.address)) {
			throw standardErrors.provider.unauthorized('Address does not match selected account')
		}
	}

	// If no chain IDs specified, return empty object
	if (!chainIds || chainIds.length === 0) {
		return {}
	}

	// Return capabilities for each requested chain ID
	const capabilities: Record<string, Record<string, unknown>> = {}
	chainIds.forEach(chainId => {
		capabilities[chainId] = {
			atomic: {
				status: 'supported',
			},
		}
	})

	return capabilities
}
