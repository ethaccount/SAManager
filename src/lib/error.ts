import { isError, ErrorCode } from 'ethers'
import type { ethers } from 'ethers'

export function parseError(unknownError: unknown): Error {
	let err: Error
	if (unknownError instanceof Error) {
		err = unknownError
	} else {
		err = new Error(String(unknownError))
	}
	return err
}

export function formatErrMsg(error: Error): string {
	if (error instanceof AppError) {
		return error.message
	}

	return `${error.name}: ${error.message}`
}

function getDetailedErrorMessage(err: Error): string {
	let messages: string[] = []

	while (err instanceof Error) {
		messages.push(`${err.name}: ${err.message}`)
		err = err.cause as Error
	}

	return messages.join(' → ')
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
