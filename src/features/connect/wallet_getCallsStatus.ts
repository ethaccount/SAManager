import { useBlockchain } from '@/stores/blockchain'
import { WalletGetCallsStatusRequest, WalletGetCallsStatusResponse } from '@samanager/sdk'
import { toUserOpReceiptHex } from 'sendop'

export async function handleGetCallsStatus(
	params: WalletGetCallsStatusRequest['params'],
): Promise<WalletGetCallsStatusResponse> {
	const identifier = params[0]
	const { bundler, selectedChainId } = useBlockchain()
	const receipt = await bundler.value.getUserOperationReceipt(identifier)

	// Convert chain ID to hex format with 0x prefix
	const chainIdHex = `0x${Number(selectedChainId.value).toString(16)}`

	// If no receipt yet, the batch is still pending
	if (!receipt) {
		return {
			version: '1.0',
			id: identifier,
			chainId: chainIdHex,
			status: 100, // Pending: Batch received but not completed onchain
			atomic: true,
		}
	}

	// If receipt exists and successful
	if (receipt.success) {
		return {
			version: '1.0',
			id: identifier,
			chainId: chainIdHex,
			status: 200, // Confirmed: Batch included onchain without reverts
			atomic: true,
			receipts: receipt.receipt ? [toUserOpReceiptHex(receipt).receipt] : undefined,
		}
	} else {
		// Receipt exists but failed
		return {
			version: '1.0',
			id: identifier,
			chainId: chainIdHex,
			status: 500, // Chain rules failure: Batch reverted completely
			atomic: true,
			receipts: receipt.receipt ? [toUserOpReceiptHex(receipt).receipt] : undefined,
		}
	}
}
