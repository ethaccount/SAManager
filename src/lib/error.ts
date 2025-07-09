import type { ethers } from 'ethers'
import { ErrorCode, isError } from 'ethers'

export function isEthersError(error: unknown): error is ethers.EthersError {
	return isError(error, (error as ethers.EthersError).code)
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

export class EthersError extends Error {
	code: ErrorCode = 'UNKNOWN_ERROR'

	constructor(message: string, options?: ErrorOptions & { code?: ErrorCode }) {
		super(message, options)
		this.name = 'EthersError'

		if (options?.cause && EthersError.isEthersError(options.cause)) {
			const ethersError = options.cause as ethers.EthersError
			this.code = ethersError.code
			this.message = this.message.replace(/^([^(]+).*/, '$1').trim()
			if (ethersError.name === 'Error') {
				this.name = `EthersError`
			} else {
				this.name = `EthersError(${ethersError.name})`
			}
		}
	}

	static isEthersError(error: unknown): error is ethers.EthersError {
		if (
			typeof error === 'object' &&
			error !== null &&
			'code' in error &&
			typeof (error as ethers.EthersError).code === 'string' &&
			'name' in error &&
			typeof (error as ethers.EthersError).name === 'string'
		) {
			return isError(error, (error as ethers.EthersError).code)
		}

		return false
	}
}

// Thrown when the user rejects the transaction in the wallet
export class UserRejectedActionError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'UserRejectedActionError'
	}
}
