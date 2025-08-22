import type { Mock, Mocked } from 'vitest'
import { Communicator } from './Communicator'
import { correlationIds } from './correlationIds'
import { standardErrors } from './error'
import { KeyManager } from './KeyManager'
import type { EncryptedData, RPCRequestMessage, RPCResponseMessage } from './message'
import { SAManagerProvider } from './SAManagerProvider'
import { bigIntToHex, decryptContent, encryptContent, exportKeyToHexString, importKeyFromHexString } from './utils'

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

		vi.spyOn(correlationIds, 'get').mockReturnValue(mockCorrelationId)

		provider = new SAManagerProvider({
			chainId: 1n,
		})
	})

	describe('constructor', () => {
		it('should initialize successfully with all supported chainIds', () => {
			// Test all supported mainnet chains
			const supportedChains = [
				1n, // ETHEREUM
				8453n, // BASE
				// 42161n, // ARBITRUM
				// 10n, // OPTIMISM
				// 137n, // POLYGON

				// Testnet chains
				11155111n, // SEPOLIA
				84532n, // BASE_SEPOLIA
				421614n, // ARBITRUM_SEPOLIA
				11155420n, // OPTIMISM_SEPOLIA
				80002n, // POLYGON_AMOY
			]

			supportedChains.forEach(chainId => {
				expect(
					() =>
						new SAManagerProvider({
							chainId,
						}),
				).not.toThrow()
			})
		})

		it('should throw error with unsupported chainId', () => {
			const unsupportedChains = [999999n, 1234n, 56n, 43114n]

			unsupportedChains.forEach(chainId => {
				expect(
					() =>
						new SAManagerProvider({
							chainId,
						}),
				).toThrowError(`Unsupported chainId: ${chainId}`)
			})
		})
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

		// Clear correlation IDs spy
		vi.restoreAllMocks()
	})

	describe('eth_requestAccounts with handshake', () => {
		it('should perform a successful eth_requestAccounts with handshake', async () => {
			;(decryptContent as Mock).mockResolvedValueOnce({ result: { value: ['0xAddress'] } })

			const emitSpy = vi.spyOn(provider, 'emit')

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
				{ action: { method: 'eth_requestAccounts' }, chainId: 1 },
				mockCryptoKey,
			)

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
			const encryptionError = new Error('Encryption failed')
			;(encryptContent as Mock).mockRejectedValueOnce(encryptionError)

			await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowError(
				new Error('Failed to encrypt request', { cause: encryptionError }),
			)
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

	describe('eth_chainId', () => {
		it('should handle eth_chainId without requiring popup', async () => {
			const result = await provider.request({ method: 'eth_chainId' })

			expect(result).toBe('0x1') // chainId 1n converted to hex

			// Verify no popup interaction occurred
			expect(mockCommunicator.waitForPopupLoaded).not.toHaveBeenCalled()
			expect(mockCommunicator.postRequestAndWaitForResponse).not.toHaveBeenCalled()
			expect(mockKeyManager.getSharedSecret).not.toHaveBeenCalled()
		})
	})

	describe('popup management', () => {
		it('should close the popup after the request is sent', async () => {
			;(decryptContent as Mock).mockResolvedValueOnce({ result: { value: ['0xAddress'] } })

			await provider.request({ method: 'eth_requestAccounts' })

			// Verify disconnect is called to close popup
			expect(mockCommunicator.disconnect).toHaveBeenCalledTimes(1)
		})
	})

	describe('disconnect', () => {
		it('should clear accounts when disconnect is called', async () => {
			const emitSpy = vi.spyOn(provider, 'emit')

			// First populate accounts
			;(decryptContent as Mock).mockResolvedValueOnce({ result: { value: ['0xAddress'] } })
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
})
