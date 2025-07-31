import type { ErrorCode, ethers, EthersError } from 'ethers'
import { isError } from 'ethers'

export function isEthersError(error: unknown): error is EthersError {
	const validErrorCodes: ErrorCode[] = [
		'UNKNOWN_ERROR',
		'NOT_IMPLEMENTED',
		'UNSUPPORTED_OPERATION',
		'NETWORK_ERROR',
		'SERVER_ERROR',
		'TIMEOUT',
		'BAD_DATA',
		'CANCELLED',
		'BUFFER_OVERRUN',
		'NUMERIC_FAULT',
		'INVALID_ARGUMENT',
		'MISSING_ARGUMENT',
		'UNEXPECTED_ARGUMENT',
		'VALUE_MISMATCH',
		'CALL_EXCEPTION',
		'INSUFFICIENT_FUNDS',
		'NONCE_EXPIRED',
		'REPLACEMENT_UNDERPRICED',
		'TRANSACTION_REPLACED',
		'UNCONFIGURED_NAME',
		'OFFCHAIN_FAULT',
		'ACTION_REJECTED',
	]

	if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
		return validErrorCodes.includes(error.code as ErrorCode)
	}

	return false
}

export function isUserRejectedError(error: unknown): boolean {
	if (error instanceof Error) {
		if (isEthersError(error)) {
			if (isError(error, 'ACTION_REJECTED')) {
				return true
			}
		}
		if (error.message.includes('The operation either timed out or was not allowed')) {
			return true
		}
	}

	return false
}

export function getEthersErrorMsg(error: ethers.EthersError, prefix?: string): string {
	const msg = error.error?.message || error.error?.toString() || error.message || error.toString()
	return prefix ? `${prefix}: ${msg}` : msg
}

export function getErrorMsg(error: unknown, prefix?: string): string {
	const msg = error instanceof Error ? error.message : String(error)
	return prefix ? `${prefix}: ${msg}` : msg
}

export function getErrorChainMessage(err: unknown, prefix?: string): string {
	const msg = err instanceof Error ? err.message : String(err)
	if (err instanceof Error) {
		const messages: string[] = []

		while (err instanceof Error) {
			messages.push(`${err.name}: ${err.message}`)
			err = err.cause as Error
		}

		return prefix ? `${prefix}: ${messages.join(' → ')}` : messages.join(' → ')
	}

	return prefix ? `${prefix}: ${msg}` : msg
}

export function parseError(unknownError: unknown): Error {
	let err: Error
	switch (true) {
		case unknownError instanceof Error:
			err = unknownError
			break
		default:
			err = new Error(String(unknownError))
	}
	return err
}

// ================================ Error classes =================================

export class AppError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'AppError'
	}
}

// Thrown when the user rejects the transaction in the wallet
export class UserRejectedActionError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'UserRejectedActionError'
	}
}
