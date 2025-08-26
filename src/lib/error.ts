import { displayChainName } from '@/stores/blockchain/chains'
import { ProviderRpcError } from '@samanager/sdk'
import type { ErrorCode, ethers, EthersError } from 'ethers'
import { isError } from 'ethers'

export function isProviderRpcError(e: unknown): e is ProviderRpcError {
	return e instanceof Object && 'code' in e && 'message' in e
}

export function makeFatalError(message: string) {
	alert(`Fatal Error: ${message}`)
	window.location.reload()
}

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

/**
 * Checks if an error indicates a user rejection from browser wallet or passkey.
 */
export function isUserRejectedError(error: unknown): boolean {
	if (error instanceof Error) {
		if (isEthersError(error)) {
			if (isError(error, 'ACTION_REJECTED')) {
				return true
			}
		}
		if (
			// desktop chrome error
			error.message.includes('The operation either timed out or was not allowed') ||
			// mobile chrome error
			error.message.includes(
				'The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.',
			)
		) {
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

/**
 * Checks if an error indicates a chain ID mismatch.
 * @param error The error to check
 * @returns true if it's a chain mismatch error, false otherwise
 */
export function isChainMismatchError(error: unknown): boolean {
	if (error instanceof Error) {
		if (isEthersError(error)) {
			const errorMsg = getEthersErrorMsg(error)
			return /Provided chainId "\d+" must match the active chainId "\d+"/.test(errorMsg)
		}
	}
	return false
}

/**
 * Gets a user-friendly message for chain mismatch errors.
 * @param error The chain mismatch error
 * @returns A formatted user-friendly message
 */
export function getChainMismatchErrorMessage(error: unknown): string {
	if (error instanceof Error && isEthersError(error)) {
		const errorMsg = getEthersErrorMsg(error)
		const chainMismatchMatch = errorMsg.match(/Provided chainId "(\d+)" must match the active chainId "(\d+)"/)
		if (chainMismatchMatch) {
			const expectedChainId = chainMismatchMatch[1]
			const currentChainName = displayChainName(Number(expectedChainId))
			return `Please switch your EOA Wallet network to ${currentChainName} to sign the user operation`
		}
	}
	return 'Chain mismatch error'
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
