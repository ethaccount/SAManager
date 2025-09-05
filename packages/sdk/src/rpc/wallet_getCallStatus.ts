import { standardErrors } from '../error'
import { decodeCallIdentifier, type CallIdentifier } from '../identifier'
import type { RequestArguments } from '../types'
import { getErrorMessage, toChainIdHex } from '../utils'
import type { WalletGetCallsStatusResponse } from './eip5792-types'
import type { UserOperationReceiptHex } from './erc4337-types'

export async function handleGetCallsStatus(
	request: RequestArguments,
	origin: string,
): Promise<WalletGetCallsStatusResponse> {
	if (
		!request.params ||
		!Array.isArray(request.params) ||
		request.params.length !== 1 ||
		typeof request.params[0] !== 'string'
	) {
		throw standardErrors.rpc.invalidParams()
	}

	const identifier: string = request.params[0]

	let decodedIdentifier: CallIdentifier
	try {
		decodedIdentifier = decodeCallIdentifier(identifier)
	} catch (e) {
		throw standardErrors.rpc.invalidParams(`Error decoding identifier: ${getErrorMessage(e)}`)
	}

	let receipt: UserOperationReceiptHex | undefined
	try {
		const url = new URL(origin + '/api/provider')
		url.searchParams.set('chainId', decodedIdentifier.chainId.toString())
		url.searchParams.set('provider', 'alchemy')

		const res = await fetch(url, {
			method: 'POST',
			body: JSON.stringify({
				method: 'eth_getUserOperationReceipt',
				params: [decodedIdentifier.hash],
			}),
		})

		const result = (await res.json()) as UserOperationReceiptHex | undefined
		if (!result || !('result' in result)) {
			throw new Error('No result found')
		}
		receipt = result.result as UserOperationReceiptHex | undefined
	} catch (e) {
		throw standardErrors.rpc.internal(`Error getting user operation receipt: ${getErrorMessage(e)}`)
	}

	const chainIdHex = toChainIdHex(decodedIdentifier.chainId)

	const baseResponse: Omit<WalletGetCallsStatusResponse, 'status' | 'receipts'> = {
		version: '2.0',
		id: identifier,
		chainId: chainIdHex,
		atomic: true,
	}

	// If no receipt yet, the batch is still pending
	if (!receipt) {
		return {
			...baseResponse,
			status: 100, // Pending: Batch received but not completed onchain
		}
	}

	// If receipt exists and successful
	if (receipt.success) {
		return {
			...baseResponse,
			status: 200, // Confirmed: Batch included onchain without reverts
			receipts: receipt.receipt ? [receipt.receipt] : undefined,
		}
	} else {
		// Receipt exists but failed
		return {
			...baseResponse,
			status: 500, // Chain rules failure: Batch reverted completely
			receipts: receipt.receipt ? [receipt.receipt] : undefined,
		}
	}
}
