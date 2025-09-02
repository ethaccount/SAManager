import { WalletGetCapabilitiesRequest } from '@samanager/sdk'

export function handleGetCapabilities(params: WalletGetCapabilitiesRequest['params']) {
	const [_address, chainIds] = params

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
