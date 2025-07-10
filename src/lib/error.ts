import type { ethers, EthersError } from 'ethers'

/**
 * Check if the error is from ethers.js by checking if the error has a error property and the error property is an object
 */
export function isEthersError(error: unknown): error is EthersError {
	if (
		'error' in <EthersError>error &&
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		typeof error.code === 'string' &&
		'name' in error &&
		typeof error.name === 'string'
	) {
		return true
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
