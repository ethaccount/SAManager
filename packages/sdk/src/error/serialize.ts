import { standardErrorCodes } from './constants'
import { EthereumProviderError, EthereumRpcError, isErrorResponse } from './errors'
import type { Web3Response } from './types'
import { serialize, type SerializedEthereumRpcError } from './utils'

/**
 * Serializes an error to a format that is compatible with the Ethereum JSON RPC error format.
 */
export function serializeError(error: unknown) {
	const serialized = serialize(getErrorObject(error), {
		shouldIncludeStack: true,
	})

	return {
		...serialized,
	}
}

export function deserializeError(serialized: SerializedEthereumRpcError): Error {
	const { code, message, data, stack } = serialized

	const isProviderError = code >= 1000 && code <= 4999
	const error = isProviderError
		? new EthereumProviderError(code, message, data)
		: new EthereumRpcError(code, message, data)

	if (stack) error.stack = stack
	return error
}

/**
 * Converts an error to a serializable object.
 */
function getErrorObject(error: string | Web3Response | unknown) {
	if (typeof error === 'string') {
		return {
			message: error,
			code: standardErrorCodes.rpc.internal,
		}
	}
	if (isErrorResponse(error)) {
		const message = error.errorMessage
		const code =
			error.errorCode ??
			(message.match(/(denied|rejected)/i) ? standardErrorCodes.provider.userRejectedRequest : undefined)

		return {
			...error,
			message,
			code,
			data: { method: error.method },
		}
	}
	return error
}
