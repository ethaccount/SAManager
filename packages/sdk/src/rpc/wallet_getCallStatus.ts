import { standardErrors } from '../error'
import { decodeCallIdentifier, type CallIdentifier } from '../identifier'
import type { RequestArguments } from '../types'
import { getErrorMessage } from '../utils'
import type { WalletGetCallsStatusResponse } from './eip5792'

type UserOperationReceiptHex = {
	userOpHash: string
	entryPoint: string
	sender: string
	nonce: string
	paymaster: string
	actualGasUsed: string
	actualGasCost: string
	success: boolean
	logs: UserOperationLogHex[]
	receipt: {
		transactionHash: string
		transactionIndex: string
		from: string
		to: string
		status: string
		logsBloom: string
		blockHash: string
		blockNumber: string
		contractAddress: null | string
		gasUsed: string
		cumulativeGasUsed: string
		effectiveGasPrice: string
		logs: UserOperationLogHex[]
	}
}

type UserOperationLogHex = {
	logIndex: string
	transactionIndex: string
	transactionHash: string
	blockHash: string
	blockNumber: string
	address: string
	data: string
	topics: string[]
}

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

	const chainIdHex = `0x${Number(decodedIdentifier.chainId).toString(16)}`

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
			receipts: receipt.receipt ? [receipt.receipt] : undefined,
		}
	} else {
		// Receipt exists but failed
		return {
			version: '1.0',
			id: identifier,
			chainId: chainIdHex,
			status: 500, // Chain rules failure: Batch reverted completely
			atomic: true,
			receipts: receipt.receipt ? [receipt.receipt] : undefined,
		}
	}
}
