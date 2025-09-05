import { SUPPORTED_CHAIN_IDS } from '@/stores/blockchain'
import { Capability, standardErrors, WalletGetCapabilitiesRequest } from '@samanager/sdk'
import { getAccountCapabilityNames, getCapabilities } from '../account-capabilities/capabilities'
import { validateAccountConnection, validateChainIdFormat, validateChainIdSupport } from './common'

export async function handleGetCapabilities(params: WalletGetCapabilitiesRequest['params']) {
	const [address, chainIds] = params

	const account = validateAccountConnection(address)
	if (chainIds) {
		if (!Array.isArray(chainIds) || chainIds.length === 0) {
			throw standardErrors.rpc.invalidParams('Invalid chainIds')
		}
		chainIds.forEach(chainId => {
			validateChainIdFormat(chainId)
			validateChainIdSupport(chainId)
		})
	}

	const accountCapabilities = getAccountCapabilityNames(account)

	let capabilities: Record<string, Record<string, Capability>> = {}

	// If no chain IDs specified, return capabilities for all supported chain IDs
	if (!chainIds) {
		const supportedChainIdHexs = SUPPORTED_CHAIN_IDS.map(chainId => '0x' + BigInt(chainId).toString(16))

		capabilities = supportedChainIdHexs.reduce(
			(acc, chainId) => ({
				...acc,
				[chainId]: getCapabilities(accountCapabilities),
			}),
			{},
		)
	} else {
		// Return capabilities for each requested chain ID
		chainIds.forEach(chainId => {
			capabilities[chainId] = getCapabilities(accountCapabilities)
		})
	}

	return capabilities
}
