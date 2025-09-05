import { standardErrors, WalletGetCapabilitiesRequest } from '@samanager/sdk'
import { validateAccountConnection, validateChainIdFormat, validateChainIdSupport } from './common'

export async function handleGetCapabilities(params: WalletGetCapabilitiesRequest['params']) {
	const [address, chainIds] = params

	validateAccountConnection(address)

	if (chainIds) {
		if (!Array.isArray(chainIds) || chainIds.length === 0) {
			throw standardErrors.rpc.invalidParams('Invalid chainIds')
		}
		chainIds.forEach(chainId => {
			validateChainIdFormat(chainId)
			validateChainIdSupport(chainId)
		})
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
