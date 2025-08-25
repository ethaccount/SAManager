import { standardErrorCodes } from './constants'
import { standardErrors } from './errors'
import { serializeError } from './serialize'
import type { Web3Response } from './types'

describe('serializeError', () => {
	test('with ErrorResponse object', () => {
		const errorResponse: Web3Response = {
			method: 'generic',
			errorMessage: 'test ErrorResponse object',
			errorCode: standardErrorCodes.provider.unsupportedMethod,
		}

		const serialized = serializeError(errorResponse)
		expect(serialized.code).toEqual(standardErrorCodes.provider.unsupportedMethod)
		expect(serialized.message).toEqual('test ErrorResponse object')
	})

	test('with standardError', () => {
		const error = standardErrors.provider.userRejectedRequest({})

		const serialized = serializeError(error)
		expect(serialized.code).toEqual(standardErrorCodes.provider.userRejectedRequest)
		expect(serialized.message).toEqual(error.message)
		expect(serialized.stack).toEqual(expect.stringContaining('User rejected'))
	})

	test('with unsupportedChain', () => {
		const error = standardErrors.provider.unsupportedChain()

		const serialized = serializeError(error)
		expect(serialized.code).toEqual(standardErrorCodes.provider.unsupportedChain)
		expect(serialized.message).toEqual(error.message)
		expect(serialized.stack).toEqual(expect.stringContaining('Unrecognized chain ID'))
	})

	test('with Error object', () => {
		const error = new Error('test Error object')

		const serialized = serializeError(error)
		expect(serialized.code).toEqual(standardErrorCodes.rpc.internal)
		expect(serialized.message).toEqual('test Error object')
		expect(serialized.stack).toEqual(expect.stringContaining('test Error object'))
	})

	test('with string', () => {
		const error = 'test error with just string'

		const serialized = serializeError(error)
		expect(serialized.code).toEqual(standardErrorCodes.rpc.internal)
		expect(serialized.message).toEqual('test error with just string')
	})

	test('with unknown type', () => {
		const error = { unknown: 'error' }
		const serialized = serializeError(error)
		expect(serialized.code).toEqual(standardErrorCodes.rpc.internal)
		expect(serialized.message).toEqual('Unspecified error message.')
	})
})
