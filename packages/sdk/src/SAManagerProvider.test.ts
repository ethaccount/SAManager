import type { Mock, Mocked } from 'vitest'
import { Communicator } from './Communicator'
import { SAManagerProvider, type ProviderEventCallback } from './SAManagerProvider'
import { KeyManager } from './KeyManager'
import type { EncryptedData, RPCRequestMessage, RPCResponseMessage } from './message'
import { decryptContent, encryptContent, exportKeyToHexString } from './utils'
import { importKeyFromHexString } from './utils'
import { correlationIds } from './correlationIds'
import { standardErrors } from './error'

vi.mock('./Communicator', () => ({
	Communicator: vi.fn(() => ({
		postRequestAndWaitForResponse: vi.fn(),
		waitForPopupLoaded: vi.fn(),
	})),
}))
vi.mock('./KeyManager')
vi.mock('./utils', () => ({
	decryptContent: vi.fn(),
	encryptContent: vi.fn(),
	exportKeyToHexString: vi.fn(),
	importKeyFromHexString: vi.fn(),
}))

const mockCryptoKey = {} as CryptoKey
const encryptedData = {} as EncryptedData
const mockCorrelationId = '2-2-3-4-5'
const mockSuccessResponse: RPCResponseMessage = {
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
	let mockCallback: ProviderEventCallback
	let mockKeyManager: Mocked<KeyManager>

	beforeEach(async () => {
		mockCommunicator = new Communicator() as Mocked<Communicator>
		mockCommunicator.waitForPopupLoaded.mockResolvedValue({} as Window)
		mockCommunicator.postRequestAndWaitForResponse.mockResolvedValue(mockSuccessResponse)

		mockCallback = vi.fn()
		mockKeyManager = new KeyManager() as Mocked<KeyManager>
		;(KeyManager as Mock).mockImplementation(() => mockKeyManager)
		mockKeyManager.getSharedSecret.mockResolvedValueOnce(null)
		mockKeyManager.getSharedSecret.mockResolvedValue(mockCryptoKey)
		;(importKeyFromHexString as Mock).mockResolvedValue(mockCryptoKey)
		;(exportKeyToHexString as Mock).mockResolvedValueOnce('0xPublicKey')
		;(encryptContent as Mock).mockResolvedValue(encryptedData)
		vi.spyOn(correlationIds, 'get').mockReturnValue(mockCorrelationId)

		provider = new SAManagerProvider({
			chainId: 1n,
			communicator: mockCommunicator,
			callback: mockCallback,
		})
	})

	afterEach(async () => {
		vi.clearAllMocks()
		vi.resetAllMocks()

		// Clear communicator mocks
		mockCommunicator.waitForPopupLoaded.mockClear()
		mockCommunicator.postRequestAndWaitForResponse.mockClear()

		// Clear key manager mocks
		mockKeyManager.getSharedSecret.mockClear()
		mockKeyManager.setPeerPublicKey.mockClear()

		// Clear utility function mocks
		;(importKeyFromHexString as Mock).mockClear()
		;(exportKeyToHexString as Mock).mockClear()
		;(encryptContent as Mock).mockClear()
		;(decryptContent as Mock).mockClear()

		// Clear correlation IDs spy
		vi.restoreAllMocks()
	})

	describe('eth_requestAccounts with handshake', () => {
		it('should perform a successful eth_requestAccounts with handshake', async () => {
			;(decryptContent as Mock).mockResolvedValueOnce({ result: { value: ['0xAddress'] } })

			expect(provider['accounts']).toEqual([])

			await expect(provider.request({ method: 'eth_requestAccounts' })).resolves.toEqual(['0xAddress'])

			// Verify accounts state is updated
			expect(provider['accounts']).toEqual(['0xAddress'])

			// Verify shared secret is checked twice:
			// 1. During handshake check (returns null to trigger handshake)
			// 2. During encryption (returns the key for encryption)
			// 3. During decryption (returns the key for decryption)
			expect(mockKeyManager.getSharedSecret).toHaveBeenCalledTimes(3)

			// Verify peer public key is set during handshake
			expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(mockCryptoKey)

			// Makes two separate calls to postRequestAndWaitForResponse: First for handshake message; Second for encrypted request
			expect(mockCommunicator.postRequestAndWaitForResponse).toHaveBeenCalledTimes(2)

			// Verify handshake message structure
			const [handshakeCall, encryptedCall] = mockCommunicator.postRequestAndWaitForResponse.mock.calls
			expect((handshakeCall[0] as RPCRequestMessage).content).toHaveProperty('handshake')
			expect((encryptedCall[0] as RPCRequestMessage).content).toHaveProperty('encrypted')

			// Verify encryption of actual request
			expect(encryptContent).toHaveBeenCalledWith(
				{ action: { method: 'eth_requestAccounts' }, chainId: 1n },
				mockCryptoKey,
			)

			// Verify popup loading sequence
			expect(mockCommunicator.waitForPopupLoaded).toHaveBeenCalledTimes(2)

			expect(importKeyFromHexString).toHaveBeenCalledWith('public', '0xPublicKey')
			expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(mockCryptoKey)
			expect(decryptContent).toHaveBeenCalledWith(encryptedData, mockCryptoKey)

			expect(mockCallback).toHaveBeenCalledWith('accountsChanged', ['0xAddress'])
		})

		it('should throw an error if failure in response.content during handshake', async () => {
			const mockError = standardErrors.provider.unauthorized()
			const mockFailureResponse: RPCResponseMessage = {
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
			const encryptionError = new Error('Encryption failed')
			;(encryptContent as Mock).mockRejectedValueOnce(encryptionError)

			await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowError(encryptionError)
		})

		it('should handle decryption error during response', async () => {
			const decryptionError = new Error('Decryption failed')
			;(decryptContent as Mock).mockRejectedValueOnce(decryptionError)

			await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowError(decryptionError)
		})

		it('should handle missing shared secret error', async () => {
			// Setup: handshake succeeds but shared secret is null for encrypted request
			mockKeyManager.getSharedSecret.mockResolvedValueOnce(null) // First call during handshake check
			mockKeyManager.getSharedSecret.mockResolvedValueOnce(null) // Second call during encryption

			await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowError(
				standardErrors.provider.unauthorized('No shared secret found when encrypting request'),
			)
		})

		it('should handle missing shared secret error during decryption', async () => {
			// Setup: handshake and encryption succeed but shared secret is null during decryption
			;(decryptContent as Mock).mockRejectedValueOnce(
				standardErrors.provider.unauthorized('No shared secret found when decrypting response'),
			)

			await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowError(
				standardErrors.provider.unauthorized('No shared secret found when decrypting response'),
			)
		})
	})
})
