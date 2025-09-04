import type { Mock, Mocked } from 'vitest'
import { Communicator } from './Communicator'
import { correlationIds } from './correlationIds'
import { EthereumProviderError, EthereumRpcError, serializeError, standardErrors } from './error'
import { KeyManager } from './KeyManager'
import type { EncryptedData, RPCRequestMessage, RPCResponseMessage } from './message'
import { SAManagerProvider } from './SAManagerProvider'
import {
	bigIntToHex,
	decryptContent,
	encryptContent,
	exportKeyToHexString,
	importKeyFromHexString,
	toChainIdHex,
} from './utils'

vi.mock('./Communicator', () => ({
	Communicator: vi.fn(() => ({
		postRequestAndWaitForResponse: vi.fn(),
		waitForPopupLoaded: vi.fn(),
		disconnect: vi.fn(),
	})),
}))
vi.mock('./KeyManager', () => ({
	KeyManager: vi.fn(() => ({
		getSharedSecret: vi.fn(),
		setPeerPublicKey: vi.fn(),
		getOwnPublicKey: vi.fn(),
		clear: vi.fn(),
	})),
}))
vi.mock('./utils', () => ({
	decryptContent: vi.fn(),
	encryptContent: vi.fn(),
	exportKeyToHexString: vi.fn(),
	importKeyFromHexString: vi.fn(),
	bigIntToHex: vi.fn(),
	toChainIdHex: vi.fn(),
}))

const MOCK_URL = 'http://localhost:3000/connect'

const mockCryptoKey = {} as CryptoKey
const encryptedData = {} as EncryptedData
const mockCorrelationId = '2-2-3-4-5'
const mockSuccessResponse: RPCResponseMessage = {
	target: 'samanager',
	id: '1-2-3-4-5',
	correlationId: mockCorrelationId,
	requestId: '1-2-3-4-5',
	sender: '0xPublicKey',
	content: { encrypted: encryptedData },
	timestamp: new Date(),
}

describe('SAManagerProvider', () => {
	let provider: SAManagerProvider
	let mockCommunicator: Mocked<Communicator>
	let mockKeyManager: Mocked<KeyManager>

	beforeEach(async () => {
		mockCommunicator = new Communicator({ url: MOCK_URL }) as Mocked<Communicator>
		;(Communicator as Mock).mockImplementation(() => mockCommunicator)
		mockCommunicator.waitForPopupLoaded.mockResolvedValue({} as Window)
		mockCommunicator.postRequestAndWaitForResponse.mockResolvedValue(mockSuccessResponse)

		mockKeyManager = new KeyManager() as Mocked<KeyManager>
		;(KeyManager as Mock).mockImplementation(() => mockKeyManager)
		mockKeyManager.getSharedSecret.mockResolvedValueOnce(null)
		mockKeyManager.getSharedSecret.mockResolvedValue(mockCryptoKey)
		;(importKeyFromHexString as Mock).mockResolvedValue(mockCryptoKey)
		;(exportKeyToHexString as Mock).mockResolvedValueOnce('0xPublicKey')
		;(encryptContent as Mock).mockResolvedValue(encryptedData)
		;(bigIntToHex as Mock).mockReturnValue('0x1')
		;(toChainIdHex as Mock).mockReturnValue('0x1')

		vi.spyOn(correlationIds, 'get').mockReturnValue(mockCorrelationId)

		provider = new SAManagerProvider()
	})

	afterEach(async () => {
		vi.clearAllMocks()
		vi.resetAllMocks()

		// Clear communicator mocks
		mockCommunicator.waitForPopupLoaded.mockClear()
		mockCommunicator.postRequestAndWaitForResponse.mockClear()
		mockCommunicator.disconnect.mockClear()

		// Clear key manager mocks
		mockKeyManager.getSharedSecret.mockClear()
		mockKeyManager.setPeerPublicKey.mockClear()
		mockKeyManager.clear.mockClear()

		// Clear utility function mocks
		;(importKeyFromHexString as Mock).mockClear()
		;(exportKeyToHexString as Mock).mockClear()
		;(encryptContent as Mock).mockClear()
		;(decryptContent as Mock).mockClear()
		;(bigIntToHex as Mock).mockClear()
		;(toChainIdHex as Mock).mockClear()

		// Clear correlation IDs spy
		vi.restoreAllMocks()
	})

	describe('eth_requestAccounts with handshake', () => {
		it('should perform a successful eth_requestAccounts with handshake', async () => {
			// First call during handshake - only needs data.chainId
			;(decryptContent as Mock).mockResolvedValueOnce({
				data: { chainId: 1 },
			})
			// Second call during actual request - needs result and data
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: { value: ['0xAddress'] },
				data: { chainId: 1 },
			})

			const emitSpy = vi.spyOn(provider, 'emit')

			expect(provider['accounts']).toEqual([])

			await expect(provider.request({ method: 'eth_requestAccounts' })).resolves.toEqual(['0xAddress'])

			// Verify accounts state is updated
			expect(provider['accounts']).toEqual(['0xAddress'])

			// Verify shared secret is checked four times:
			// 1. During handshake check (returns null to trigger handshake)
			// 2. During handshake decryption (returns the key for decryption)
			// 3. During encryption (returns the key for encryption)
			// 4. During response decryption (returns the key for decryption)
			expect(mockKeyManager.getSharedSecret).toHaveBeenCalledTimes(4)

			// Verify peer public key is set during handshake
			expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(mockCryptoKey)

			// Makes two separate calls to postRequestAndWaitForResponse: First for handshake message; Second for encrypted request
			expect(mockCommunicator.postRequestAndWaitForResponse).toHaveBeenCalledTimes(2)

			// Verify handshake message structure
			const [handshakeCall, encryptedCall] = mockCommunicator.postRequestAndWaitForResponse.mock.calls
			expect((handshakeCall[0] as RPCRequestMessage).content).toHaveProperty('handshake')
			expect((encryptedCall[0] as RPCRequestMessage).content).toHaveProperty('encrypted')

			// Verify encryption of actual request
			expect(encryptContent).toHaveBeenCalledWith({ action: { method: 'eth_requestAccounts' } }, mockCryptoKey)

			// Verify popup loading sequence
			expect(mockCommunicator.waitForPopupLoaded).toHaveBeenCalledTimes(2)

			expect(importKeyFromHexString).toHaveBeenCalledWith('public', '0xPublicKey')
			expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(mockCryptoKey)
			expect(decryptContent).toHaveBeenCalledWith(encryptedData, mockCryptoKey)

			expect(emitSpy).toHaveBeenCalledWith('accountsChanged', ['0xAddress'])
		})

		it('should throw an error if failure in response.content during handshake', async () => {
			const mockError = standardErrors.provider.unauthorized()
			const mockFailureResponse: RPCResponseMessage = {
				target: 'samanager',
				id: '1-2-3-4-5',
				correlationId: mockCorrelationId,
				requestId: '1-2-3-4-5',
				sender: '0xPublicKey',
				content: { failure: mockError },
				timestamp: new Date(),
			}
			mockCommunicator.postRequestAndWaitForResponse.mockResolvedValueOnce(mockFailureResponse)

			await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowError(mockError)
		})

		it('should handle encryption error during request', async () => {
			// First call during handshake - needs to succeed
			;(decryptContent as Mock).mockResolvedValueOnce({
				data: { chainId: 1 },
			})

			const encryptionError = new Error('Encryption failed')
			;(encryptContent as Mock).mockRejectedValueOnce(encryptionError)

			await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowError(
				new Error('Error encrypting request', { cause: encryptionError }),
			)
		})

		it('should handle decryption error during response', async () => {
			// First call during handshake - needs to succeed
			;(decryptContent as Mock).mockResolvedValueOnce({
				data: { chainId: 1 },
			})

			const decryptionError = new Error('Decryption failed')
			;(decryptContent as Mock).mockRejectedValueOnce(decryptionError)

			await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowError(decryptionError)
		})

		it('should handle missing shared secret error', async () => {
			// This test verifies that when the shared secret becomes unavailable during the process,
			// the appropriate error is thrown. Due to the complexity of the handshake flow,
			// we'll test the case where decryption fails due to missing shared secret.

			// Setup successful handshake
			;(decryptContent as Mock).mockResolvedValueOnce({
				data: { chainId: 1 },
			})
			// Setup request decryption failure due to missing shared secret
			;(decryptContent as Mock).mockRejectedValueOnce(
				standardErrors.provider.unauthorized('No shared secret found when decrypting response'),
			)

			await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowError(
				standardErrors.provider.unauthorized('No shared secret found when decrypting response'),
			)
		})

		it('should handle missing shared secret error during decryption', async () => {
			// Setup: handshake succeeds but decryption fails during actual request
			;(decryptContent as Mock).mockResolvedValueOnce({
				data: { chainId: 1 },
			})
			;(decryptContent as Mock).mockRejectedValueOnce(
				standardErrors.provider.unauthorized('No shared secret found when decrypting response'),
			)

			await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowError(
				standardErrors.provider.unauthorized('No shared secret found when decrypting response'),
			)
		})
	})

	describe('eth_chainId', () => {
		it('should handle eth_chainId by calling popup when chainId is 0', async () => {
			// First call during handshake
			;(decryptContent as Mock).mockResolvedValueOnce({
				data: { chainId: 1 },
			})
			// Second call for the actual chainId request
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: { value: '0x1' },
				data: { chainId: 1 },
			})

			const result = await provider.request({ method: 'eth_chainId' })

			expect(result).toBe('0x1')

			// Since chainId starts as 0, it should call the popup
			expect(mockCommunicator.waitForPopupLoaded).toHaveBeenCalled()
			expect(mockCommunicator.postRequestAndWaitForResponse).toHaveBeenCalled()
		})
	})

	describe('popup management', () => {
		it('should close the popup after the request is sent', async () => {
			// First call during handshake
			;(decryptContent as Mock).mockResolvedValueOnce({
				data: { chainId: 1 },
			})
			// Second call for the actual request
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: { value: ['0xAddress'] },
				data: { chainId: 1 },
			})

			await provider.request({ method: 'eth_requestAccounts' })

			// Verify disconnect is called to close popup
			expect(mockCommunicator.disconnect).toHaveBeenCalledTimes(1)
		})
	})

	describe('disconnect', () => {
		it('should clear accounts when disconnect is called', async () => {
			const emitSpy = vi.spyOn(provider, 'emit')

			// First populate accounts - need both handshake and request mocks
			;(decryptContent as Mock).mockResolvedValueOnce({
				data: { chainId: 1 },
			})
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: { value: ['0xAddress'] },
				data: { chainId: 1 },
			})
			await provider.request({ method: 'eth_requestAccounts' })
			expect(provider['accounts']).toEqual(['0xAddress'])

			// Then call disconnect
			await provider.disconnect()

			// Verify accounts are cleared
			expect(provider['accounts']).toEqual([])
			expect(emitSpy).toHaveBeenCalledWith('accountsChanged', [])
		})
	})

	describe('handlePopupDisconnect', () => {
		it('should clear keyManager when popup disconnects', () => {
			// Call the private method directly
			provider['handlePopupDisconnect']()

			// Verify keyManager.clear() was called
			expect(mockKeyManager.clear).toHaveBeenCalledTimes(1)
		})
	})

	describe('error handling and deserialization', () => {
		describe('failure in response content', () => {
			it('should deserialize EthereumProviderError from response content failure', async () => {
				// Create a provider error and serialize it
				const originalError = new EthereumProviderError(4001, 'User rejected the request', {
					method: 'eth_requestAccounts',
				})
				const serializedError = serializeError(originalError)

				const mockFailureResponse: RPCResponseMessage = {
					target: 'samanager',
					id: '1-2-3-4-5',
					correlationId: mockCorrelationId,
					requestId: '1-2-3-4-5',
					sender: '0xPublicKey',
					content: { failure: serializedError },
					timestamp: new Date(),
				}
				mockCommunicator.postRequestAndWaitForResponse.mockResolvedValueOnce(mockFailureResponse)

				let caughtError: Error | undefined
				try {
					await provider.request({ method: 'eth_requestAccounts' })
				} catch (error) {
					caughtError = error as Error
				}

				// Verify the error is properly deserialized
				expect(caughtError).toBeInstanceOf(EthereumProviderError)
				expect(caughtError?.message).toBe('User rejected the request')
				expect((caughtError as EthereumProviderError<any>).code).toBe(4001)
				expect((caughtError as EthereumProviderError<any>).data).toEqual({ method: 'eth_requestAccounts' })
			})

			it('should deserialize EthereumRpcError from response content failure', async () => {
				// Create an RPC error and serialize it
				const originalError = new EthereumRpcError(-32603, 'Internal JSON-RPC error', {
					details: 'Server error',
				})
				const serializedError = serializeError(originalError)

				const mockFailureResponse: RPCResponseMessage = {
					target: 'samanager',
					id: '1-2-3-4-5',
					correlationId: mockCorrelationId,
					requestId: '1-2-3-4-5',
					sender: '0xPublicKey',
					content: { failure: serializedError },
					timestamp: new Date(),
				}
				mockCommunicator.postRequestAndWaitForResponse.mockResolvedValueOnce(mockFailureResponse)

				let caughtError: Error | undefined
				try {
					await provider.request({ method: 'eth_requestAccounts' })
				} catch (error) {
					caughtError = error as Error
				}

				// Verify the error is properly deserialized as RPC error
				expect(caughtError).toBeInstanceOf(EthereumRpcError)
				expect(caughtError).not.toBeInstanceOf(EthereumProviderError)
				expect(caughtError?.message).toBe('Internal JSON-RPC error')
				expect((caughtError as EthereumRpcError<any>).code).toBe(-32603)
				expect((caughtError as EthereumRpcError<any>).data).toEqual({ details: 'Server error' })
			})

			it('should preserve stack trace when deserializing error from response content failure', async () => {
				const originalError = new EthereumProviderError(4100, 'Unauthorized')
				originalError.stack = 'Custom stack trace\nat line 1\nat line 2'
				const serializedError = serializeError(originalError)

				const mockFailureResponse: RPCResponseMessage = {
					target: 'samanager',
					id: '1-2-3-4-5',
					correlationId: mockCorrelationId,
					requestId: '1-2-3-4-5',
					sender: '0xPublicKey',
					content: { failure: serializedError },
					timestamp: new Date(),
				}
				mockCommunicator.postRequestAndWaitForResponse.mockResolvedValueOnce(mockFailureResponse)

				let caughtError: Error | undefined
				try {
					await provider.request({ method: 'eth_requestAccounts' })
				} catch (error) {
					caughtError = error as Error
				}

				expect(caughtError?.stack).toBe('Custom stack trace\nat line 1\nat line 2')
			})
		})

		describe('error in result', () => {
			it('should deserialize EthereumProviderError from result error', async () => {
				// Create a provider error and serialize it
				const originalError = new EthereumProviderError(4200, 'Unsupported method', {
					method: 'wallet_nonExistentMethod',
				})
				const serializedError = serializeError(originalError)

				// Mock successful handshake first
				;(decryptContent as Mock).mockResolvedValueOnce({
					data: { chainId: 1 },
				})
				// Then mock the actual request with error in result
				;(decryptContent as Mock).mockResolvedValueOnce({
					result: { error: serializedError },
					data: { chainId: 1 },
				})

				let caughtError: Error | undefined
				try {
					await provider.request({ method: 'eth_requestAccounts' })
				} catch (error) {
					caughtError = error as Error
				}

				// Verify the error is properly deserialized
				expect(caughtError).toBeInstanceOf(EthereumProviderError)
				expect(caughtError?.message).toBe('Unsupported method')
				expect((caughtError as EthereumProviderError<any>).code).toBe(4200)
				expect((caughtError as EthereumProviderError<any>).data).toEqual({ method: 'wallet_nonExistentMethod' })
			})

			it('should deserialize EthereumRpcError from result error', async () => {
				// Create an RPC error and serialize it
				const originalError = new EthereumRpcError(-32602, 'Invalid method parameter(s)', {
					parameter: 'address',
					value: 'invalid_address',
				})
				const serializedError = serializeError(originalError)

				// Mock successful handshake first
				;(decryptContent as Mock).mockResolvedValueOnce({
					data: { chainId: 1 },
				})
				// Then mock the actual request with error in result
				;(decryptContent as Mock).mockResolvedValueOnce({
					result: { error: serializedError },
					data: { chainId: 1 },
				})

				let caughtError: Error | undefined
				try {
					await provider.request({ method: 'eth_requestAccounts' })
				} catch (error) {
					caughtError = error as Error
				}

				// Verify the error is properly deserialized as RPC error
				expect(caughtError).toBeInstanceOf(EthereumRpcError)
				expect(caughtError).not.toBeInstanceOf(EthereumProviderError)
				expect(caughtError?.message).toBe('Invalid method parameter(s)')
				expect((caughtError as EthereumRpcError<any>).code).toBe(-32602)
				expect((caughtError as EthereumRpcError<any>).data).toEqual({
					parameter: 'address',
					value: 'invalid_address',
				})
			})

			it('should preserve stack trace when deserializing error from result', async () => {
				const originalError = new EthereumRpcError(-32000, 'Invalid input')
				originalError.stack = 'Result error stack trace\nat handleResponse\nat processResult'
				const serializedError = serializeError(originalError)

				// Mock successful handshake first
				;(decryptContent as Mock).mockResolvedValueOnce({
					data: { chainId: 1 },
				})
				// Then mock the actual request with error in result
				;(decryptContent as Mock).mockResolvedValueOnce({
					result: { error: serializedError },
					data: { chainId: 1 },
				})

				let caughtError: Error | undefined
				try {
					await provider.request({ method: 'eth_requestAccounts' })
				} catch (error) {
					caughtError = error as Error
				}

				expect(caughtError?.stack).toBe('Result error stack trace\nat handleResponse\nat processResult')
			})

			it('should handle string errors by creating RPC internal error from result', async () => {
				// Create a string error that will be serialized
				const stringError = 'Something went wrong'
				const serializedError = serializeError(stringError)

				// Mock successful handshake first
				;(decryptContent as Mock).mockResolvedValueOnce({
					data: { chainId: 1 },
				})
				// Then mock the actual request with string error in result
				;(decryptContent as Mock).mockResolvedValueOnce({
					result: { error: serializedError },
					data: { chainId: 1 },
				})

				let caughtError: Error | undefined
				try {
					await provider.request({ method: 'eth_requestAccounts' })
				} catch (error) {
					caughtError = error as Error
				}

				// String errors should be deserialized as RPC internal errors
				expect(caughtError).toBeInstanceOf(EthereumRpcError)
				expect(caughtError).not.toBeInstanceOf(EthereumProviderError)
				expect(caughtError?.message).toBe('Something went wrong')
				expect((caughtError as EthereumRpcError<any>).code).toBe(-32603) // internal error code
			})
		})

		describe('error type classification', () => {
			it('should classify provider errors correctly (codes 1000-4999)', async () => {
				// Use only valid provider error codes from errorValues lookup table
				const providerCodes = [4001, 4100, 4200, 4900, 4901, 4902]

				for (const code of providerCodes) {
					const originalError = new EthereumProviderError(code, `Provider error ${code}`)
					const serializedError = serializeError(originalError)

					const mockFailureResponse: RPCResponseMessage = {
						target: 'samanager',
						id: '1-2-3-4-5',
						correlationId: mockCorrelationId,
						requestId: '1-2-3-4-5',
						sender: '0xPublicKey',
						content: { failure: serializedError },
						timestamp: new Date(),
					}
					mockCommunicator.postRequestAndWaitForResponse.mockResolvedValueOnce(mockFailureResponse)

					let caughtError: Error | undefined
					try {
						await provider.request({ method: 'eth_requestAccounts' })
					} catch (error) {
						caughtError = error as Error
					}

					expect(caughtError).toBeInstanceOf(EthereumProviderError)
					expect((caughtError as EthereumProviderError<any>).code).toBe(code)

					// Reset mocks for next iteration
					mockCommunicator.postRequestAndWaitForResponse.mockClear()
				}
			})

			it('should classify RPC errors correctly (codes outside 1000-4999)', async () => {
				// Use only valid RPC error codes from errorValues lookup table and JSON RPC server error range
				const rpcCodes = [-32700, -32603, -32602, -32601, -32000, -32001, -32002, -32050] // -32050 is in JSON RPC server error range

				for (const code of rpcCodes) {
					const originalError = new EthereumRpcError(code, `RPC error ${code}`)
					const serializedError = serializeError(originalError)

					const mockFailureResponse: RPCResponseMessage = {
						target: 'samanager',
						id: '1-2-3-4-5',
						correlationId: mockCorrelationId,
						requestId: '1-2-3-4-5',
						sender: '0xPublicKey',
						content: { failure: serializedError },
						timestamp: new Date(),
					}
					mockCommunicator.postRequestAndWaitForResponse.mockResolvedValueOnce(mockFailureResponse)

					let caughtError: Error | undefined
					try {
						await provider.request({ method: 'eth_requestAccounts' })
					} catch (error) {
						caughtError = error as Error
					}

					expect(caughtError).toBeInstanceOf(EthereumRpcError)
					expect(caughtError).not.toBeInstanceOf(EthereumProviderError)
					expect((caughtError as EthereumRpcError<any>).code).toBe(code)

					// Reset mocks for next iteration
					mockCommunicator.postRequestAndWaitForResponse.mockClear()
				}
			})

			it('should handle invalid error codes by converting them to internal error', async () => {
				// Test with invalid error codes that should be converted to -32603 (internal error)
				const invalidCodes = [0, 500, 999, 5000, 10000]

				for (const invalidCode of invalidCodes) {
					const originalError = new EthereumRpcError(invalidCode, `Invalid code error ${invalidCode}`)
					const serializedError = serializeError(originalError)

					const mockFailureResponse: RPCResponseMessage = {
						target: 'samanager',
						id: '1-2-3-4-5',
						correlationId: mockCorrelationId,
						requestId: '1-2-3-4-5',
						sender: '0xPublicKey',
						content: { failure: serializedError },
						timestamp: new Date(),
					}
					mockCommunicator.postRequestAndWaitForResponse.mockResolvedValueOnce(mockFailureResponse)

					let caughtError: Error | undefined
					try {
						await provider.request({ method: 'eth_requestAccounts' })
					} catch (error) {
						caughtError = error as Error
					}

					expect(caughtError).toBeInstanceOf(EthereumRpcError)
					expect(caughtError).not.toBeInstanceOf(EthereumProviderError)
					// Invalid codes should be converted to internal error (-32603)
					expect((caughtError as EthereumRpcError<any>).code).toBe(-32603)

					// Reset mocks for next iteration
					mockCommunicator.postRequestAndWaitForResponse.mockClear()
				}
			})
		})
	})
})
