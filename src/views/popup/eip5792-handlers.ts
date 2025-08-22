import { useBlockchain } from '@/stores/blockchain'
import { WalletGetCallsStatusRequest, WalletGetCallsStatusResponse, WalletGetCapabilitiesRequest } from '@samanager/sdk'
import { toUserOpReceiptHex } from 'sendop'

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

export async function handleGetCallsStatus(
	params: WalletGetCallsStatusRequest['params'],
): Promise<WalletGetCallsStatusResponse> {
	const identifier = params[0]
	const { bundler, selectedChainId } = useBlockchain()
	const receipt = await bundler.value.getUserOperationReceipt(identifier)
	if (receipt?.success) {
		return {
			version: '1.0',
			id: identifier,
			chainId: selectedChainId.value,
			status: 1,
			atomic: true,
			receipts: receipt.receipt ? [toUserOpReceiptHex(receipt).receipt] : undefined,
			capabilities: {},
		}
	} else {
		return {
			version: '1.0',
			id: identifier,
			chainId: selectedChainId.value,
			status: 0,
			atomic: true,
			receipts: undefined,
			capabilities: {},
		}
	}
}
