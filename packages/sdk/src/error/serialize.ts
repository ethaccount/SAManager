import { standardErrorCodes } from './constants.js'
import { isErrorResponse } from './errors.js'
import type { Web3Response } from './types.js'
import { serialize } from './utils.js'

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
