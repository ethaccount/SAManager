import type { Mock, Mocked } from 'vitest'
import { serializeError, standardErrors } from './error'
import { KeyManager } from './KeyManager'
import type { EncryptedData, RPCRequestMessage } from './message'
import { SAManagerPopup } from './SAManagerPopup'
import { decryptContent, encryptContent, exportKeyToHexString, importKeyFromHexString } from './utils'

// Mock dependencies
vi.mock('./KeyManager')
vi.mock('./utils', () => ({
	decryptContent: vi.fn(),
	encryptContent: vi.fn(),
	exportKeyToHexString: vi.fn(),
	importKeyFromHexString: vi.fn(),
}))
vi.mock('./error', () => ({
	serializeError: vi.fn(),
	standardErrors: {
		rpc: {
			invalidRequest: vi.fn(),
			methodNotSupported: vi.fn(),
		},
		provider: {
			unauthorized: vi.fn(),
		},
	},
}))

// Mock browser APIs
const mockPostMessage = vi.fn()
const mockAddEventListener = vi.fn()
const mockRandomUUID = vi.fn()

// Setup global mocks
Object.defineProperty(global, 'window', {
	value: {
		addEventListener: mockAddEventListener,
		opener: {
			postMessage: mockPostMessage,
		},
	},
	writable: true,
})

Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: mockRandomUUID,
	},
	writable: true,
})

// Mock data constants
const mockCryptoKey = {} as CryptoKey
const encryptedData = {} as EncryptedData
const mockRequestId = '1-2-3-4-5' as const
const mockResponseId = '2-3-4-5-6' as const
const mockPublicKey = '0xPublicKey'
const mockOrigin = 'https://example.com'

const mockHandshakeMessage: RPCRequestMessage = {
	target: 'samanager',
	id: mockRequestId,
	correlationId: undefined,
	requestId: mockRequestId,
	sender: mockPublicKey,
	content: { handshake: { method: 'handshake' } },
	timestamp: new Date(),
}

const _mockEncryptedMessage: RPCRequestMessage = {
	target: 'samanager',
	id: mockRequestId,
	correlationId: undefined,
	requestId: mockRequestId,
	sender: mockPublicKey,
	content: { encrypted: encryptedData },
	timestamp: new Date(),
}

describe('SAManagerPopup', () => {
	let _popup: SAManagerPopup
	let mockKeyManager: Mocked<KeyManager>
	let _mockMessageEvent: MessageEvent<RPCRequestMessage>

	beforeEach(async () => {
		// Setup KeyManager mock
		mockKeyManager = new KeyManager() as Mocked<KeyManager>
		;(KeyManager as Mock).mockImplementation(() => mockKeyManager)
		mockKeyManager.getSharedSecret.mockResolvedValue(mockCryptoKey)
		mockKeyManager.getOwnPublicKey.mockResolvedValue(mockCryptoKey)
		mockKeyManager.setPeerPublicKey.mockResolvedValue()

		// Setup utility function mocks
		;(importKeyFromHexString as Mock).mockResolvedValue(mockCryptoKey)
		;(exportKeyToHexString as Mock).mockResolvedValue(mockPublicKey)
		;(encryptContent as Mock).mockResolvedValue(encryptedData)
		;(decryptContent as Mock).mockResolvedValue({ action: { method: 'eth_requestAccounts' }, chainId: 1n })
		;(serializeError as Mock).mockReturnValue({ code: -1, message: 'Serialized error' })

		// Setup browser API mocks
		mockRandomUUID.mockReturnValue(mockResponseId)
		mockAddEventListener.mockImplementation((event, _handler) => {
			if (event === 'message') {
				// Handler stored in addEventListener mock for later use in tests
			}
		})

		// Setup standard errors mock
		;(standardErrors.rpc.invalidRequest as Mock).mockReturnValue(new Error('Invalid request'))
		;(standardErrors.rpc.methodNotSupported as Mock).mockReturnValue(new Error('Method not supported'))
		;(standardErrors.provider.unauthorized as Mock).mockReturnValue(new Error('Unauthorized'))

		// Create mock MessageEvent
		_mockMessageEvent = {
			data: mockHandshakeMessage,
			origin: mockOrigin,
			source: window.opener,
		} as MessageEvent<RPCRequestMessage>

		// Create mock wallet request handler
		const mockWalletRequestHandler = vi.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b8D1D8c8D7C94b5b8B'])

		// Create popup instance
		_popup = new SAManagerPopup({ chainId: 1n, walletRequestHandler: mockWalletRequestHandler })
	})

	afterEach(async () => {
		vi.clearAllMocks()
		vi.resetAllMocks()

		// Clear KeyManager mocks
		mockKeyManager.getSharedSecret.mockClear()
		mockKeyManager.getOwnPublicKey.mockClear()
		mockKeyManager.setPeerPublicKey.mockClear()

		// Clear utility function mocks
		;(importKeyFromHexString as Mock).mockClear()
		;(exportKeyToHexString as Mock).mockClear()
		;(encryptContent as Mock).mockClear()
		;(decryptContent as Mock).mockClear()
		;(serializeError as Mock).mockClear()

		// Clear browser API mocks
		mockAddEventListener.mockClear()
		mockPostMessage.mockClear()
		mockRandomUUID.mockClear()

		// Clear standard errors mocks
		;(standardErrors.rpc.invalidRequest as Mock).mockClear()
		;(standardErrors.rpc.methodNotSupported as Mock).mockClear()
		;(standardErrors.provider.unauthorized as Mock).mockClear()

		vi.restoreAllMocks()
	})

	describe('setupListener', () => {
		it('should register message event listener', () => {
			// Arrange & Act
			new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})

			// Assert
			expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function))
		})

		it('should ignore messages from invalid origins', async () => {
			// Arrange
			const _popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})

			const invalidOriginMessage = {
				data: mockHandshakeMessage,
				origin: 'invalid-origin',
				source: window.opener,
			} as MessageEvent<RPCRequestMessage>

			// Act
			const messageHandler = mockAddEventListener.mock.calls.find(
				call => call[0] === 'message',
			)?.[1] as EventListener

			await messageHandler(invalidOriginMessage)

			// Assert - no processing should happen
			expect(importKeyFromHexString).not.toHaveBeenCalled()
			expect(mockKeyManager.setPeerPublicKey).not.toHaveBeenCalled()
		})
	})

	describe('handleEncryptedRequest', () => {
		const mockEncryptedMessage: RPCRequestMessage = {
			target: 'samanager',
			id: mockRequestId,
			correlationId: undefined,
			requestId: mockRequestId,
			sender: mockPublicKey,
			content: { encrypted: encryptedData },
			timestamp: new Date(),
		}

		beforeEach(() => {
			mockKeyManager.getSharedSecret.mockResolvedValue(mockCryptoKey)
		})

		it('should successfully handle encrypted request', async () => {
			// Arrange
			const mockWalletHandler = vi.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b8D1D8c8D7C94b5b8B'])

			// Create the popup instance with the mock handler
			new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: mockWalletHandler,
			})

			// Act
			const messageEvent = {
				data: mockEncryptedMessage,
				origin: mockOrigin,
				source: window.opener,
			} as MessageEvent<RPCRequestMessage>

			// Get the latest message handler (from the popup we just created)
			const messageHandler = mockAddEventListener.mock.calls
				.filter(call => call[0] === 'message')
				.pop()?.[1] as EventListener

			await messageHandler(messageEvent)

			// Assert
			expect(mockKeyManager.getSharedSecret).toHaveBeenCalled()
			expect(decryptContent).toHaveBeenCalledWith(encryptedData, mockCryptoKey)
			expect(mockWalletHandler).toHaveBeenCalledWith('eth_requestAccounts', []) // Now this will pass
			expect(encryptContent).toHaveBeenCalledWith(
				{ result: { value: ['0x742d35Cc6634C0532925a3b8D1D8c8D7C94b5b8B'] } },
				mockCryptoKey,
			)
		})

		it('should send error when no shared secret available', async () => {
			// Arrange
			mockKeyManager.getSharedSecret.mockResolvedValue(null)
			const _popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})

			// Act
			const messageEvent = {
				data: mockEncryptedMessage,
				origin: mockOrigin,
				source: window.opener,
			} as MessageEvent<RPCRequestMessage>

			const messageHandler = mockAddEventListener.mock.calls.find(
				call => call[0] === 'message',
			)?.[1] as EventListener

			await messageHandler(messageEvent)

			// Assert
			expect(standardErrors.provider.unauthorized).toHaveBeenCalledWith(
				'No shared secret available for decryption',
			)
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					content: { failure: expect.any(Object) },
				}),
				mockOrigin,
			)
		})
	})

	describe('createEncryptedResponse', () => {
		it('should create encrypted response successfully', async () => {
			// Arrange
			const popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})

			mockKeyManager.getSharedSecret.mockResolvedValue(mockCryptoKey)

			// Act - Access private method via bracket notation for testing
			const result = await (popup as any).createEncryptedResponse(mockRequestId, { result: { value: 'test' } })

			// Assert
			expect(encryptContent).toHaveBeenCalledWith({ result: { value: 'test' } }, mockCryptoKey)
			expect(result).toMatchObject({
				id: mockResponseId,
				requestId: mockRequestId,
				sender: mockPublicKey,
				content: { encrypted: encryptedData },
			})
		})

		it('should throw error when no shared secret', async () => {
			// Arrange
			const popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})

			mockKeyManager.getSharedSecret.mockResolvedValue(null)

			// Act & Assert
			await expect(
				(popup as any).createEncryptedResponse(mockRequestId, { result: { value: 'test' } }),
			).rejects.toThrow()
			expect(standardErrors.provider.unauthorized).toHaveBeenCalledWith(
				'No shared secret available for encryption',
			)
		})
	})

	describe('sendErrorResponse', () => {
		it('should send error response successfully', async () => {
			// Arrange
			const popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})
			const error = new Error('Test error')

			// Act
			await (popup as any).sendErrorResponse(mockRequestId, error, mockOrigin)

			// Assert
			expect(serializeError).toHaveBeenCalledWith(error)
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					requestId: mockRequestId,
					sender: mockPublicKey,
					content: { failure: { code: -1, message: 'Serialized error' } },
				}),
				mockOrigin,
			)
		})

		it('should handle error in error response sending', async () => {
			// Arrange
			const popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})
			const error = new Error('Test error')
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			;(exportKeyToHexString as Mock).mockRejectedValueOnce(new Error('Export failed'))

			// Act
			await (popup as any).sendErrorResponse(mockRequestId, error, mockOrigin)

			// Assert
			expect(consoleSpy).toHaveBeenCalledWith('Failed to send error response:', expect.any(Error))

			consoleSpy.mockRestore()
		})
	})

	describe('notifyParentLoaded', () => {
		it('should send loaded message to parent', () => {
			// Arrange & Act
			new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})

			// Assert
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					event: 'PopupLoaded',
					id: mockResponseId,
				}),
				'*',
			)
		})
	})

	describe('updateChain', () => {
		it('should update chain ID when different', () => {
			// Arrange
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
			const popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})

			// Act
			;(popup as any).updateChain(2n)

			// Assert
			expect(consoleSpy).toHaveBeenCalledWith('Chain updated to:', '2')

			consoleSpy.mockRestore()
		})

		it('should not log when chain ID is same', () => {
			// Arrange
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
			const popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})

			// Act
			;(popup as any).updateChain(1n)

			// Assert
			expect(consoleSpy).not.toHaveBeenCalled()

			consoleSpy.mockRestore()
		})
	})

	describe('isValidOrigin', () => {
		let popup: SAManagerPopup

		beforeEach(() => {
			popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})
		})

		it('should return true for valid origins', () => {
			expect((popup as any).isValidOrigin('https://example.com')).toBe(true)
			expect((popup as any).isValidOrigin('http://localhost:3000')).toBe(true)
		})

		it('should return false for invalid origins', () => {
			expect((popup as any).isValidOrigin('')).toBe(false)
			expect((popup as any).isValidOrigin('null')).toBe(false)
			expect((popup as any).isValidOrigin('invalid-url')).toBe(false)
		})
	})

	describe('isHandshakeMessage', () => {
		let popup: SAManagerPopup

		beforeEach(() => {
			popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})
		})

		it('should return true for handshake messages', () => {
			const message = {
				content: { handshake: { method: 'handshake' } },
			} as RPCRequestMessage

			expect((popup as any).isHandshakeMessage(message)).toBe(true)
		})

		it('should return false for non-handshake messages', () => {
			const message = {
				content: { encrypted: encryptedData },
			} as RPCRequestMessage

			expect((popup as any).isHandshakeMessage(message)).toBe(false)
		})

		it('should return false for invalid messages', () => {
			expect((popup as any).isHandshakeMessage(null)).toBe(false)
			expect((popup as any).isHandshakeMessage({})).toBe(false)
			expect((popup as any).isHandshakeMessage({ content: {} })).toBe(false)
		})
	})

	describe('isEncryptedMessage', () => {
		let popup: SAManagerPopup

		beforeEach(() => {
			popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn(),
			})
		})

		it('should return true for encrypted messages', () => {
			const message = {
				content: { encrypted: encryptedData },
			} as RPCRequestMessage

			expect((popup as any).isEncryptedMessage(message)).toBe(true)
		})

		it('should return false for non-encrypted messages', () => {
			const message = {
				content: { handshake: { method: 'handshake' } },
			} as RPCRequestMessage

			expect((popup as any).isEncryptedMessage(message)).toBe(false)
		})

		it('should return false for invalid messages', () => {
			expect((popup as any).isEncryptedMessage(null)).toBe(false)
			expect((popup as any).isEncryptedMessage({})).toBe(false)
			expect((popup as any).isEncryptedMessage({ content: {} })).toBe(false)
		})
	})

	describe('handleHandshake', () => {
		it('should successfully handle handshake and send encrypted response', async () => {
			// Arrange
			const _popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b8D1D8c8D7C94b5b8B']),
			})

			// Act - simulate message event with handshake
			const messageEvent = {
				data: mockHandshakeMessage,
				origin: mockOrigin,
				source: window.opener,
			} as MessageEvent<RPCRequestMessage>

			// Get the event handler that was registered
			const messageHandler = mockAddEventListener.mock.calls.find(
				call => call[0] === 'message',
			)?.[1] as EventListener

			await messageHandler(messageEvent)

			// Assert
			expect(importKeyFromHexString).toHaveBeenCalledWith('public', mockPublicKey)
			expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(mockCryptoKey)
			expect(encryptContent).toHaveBeenCalledWith({ result: { value: 'handshake_complete' } }, mockCryptoKey)
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					id: mockResponseId,
					correlationId: undefined,
					requestId: mockRequestId,
					sender: mockPublicKey,
					content: { encrypted: encryptedData },
					timestamp: expect.any(Date),
				}),
				mockOrigin,
			)
		})

		it('should send error response when importKeyFromHexString fails', async () => {
			// Arrange
			const importError = new Error('Failed to import key')
			;(importKeyFromHexString as Mock).mockRejectedValueOnce(importError)

			const _popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b8D1D8c8D7C94b5b8B']),
			})

			// Act
			const messageEvent = {
				data: mockHandshakeMessage,
				origin: mockOrigin,
				source: window.opener,
			} as MessageEvent<RPCRequestMessage>

			const messageHandler = mockAddEventListener.mock.calls.find(
				call => call[0] === 'message',
			)?.[1] as EventListener

			await messageHandler(messageEvent)

			// Assert
			expect(serializeError).toHaveBeenCalledWith(importError)
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					id: mockResponseId,
					correlationId: undefined,
					requestId: mockRequestId,
					sender: mockPublicKey,
					content: { failure: { code: -1, message: 'Serialized error' } },
					timestamp: expect.any(Date),
				}),
				mockOrigin,
			)
		})

		it('should send error response when setPeerPublicKey fails', async () => {
			// Arrange
			const setPeerError = new Error('Failed to set peer public key')
			mockKeyManager.setPeerPublicKey.mockRejectedValueOnce(setPeerError)

			const _popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b8D1D8c8D7C94b5b8B']),
			})

			// Act
			const messageEvent = {
				data: mockHandshakeMessage,
				origin: mockOrigin,
				source: window.opener,
			} as MessageEvent<RPCRequestMessage>

			const messageHandler = mockAddEventListener.mock.calls.find(
				call => call[0] === 'message',
			)?.[1] as EventListener

			await messageHandler(messageEvent)

			// Assert
			expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(mockCryptoKey)
			expect(serializeError).toHaveBeenCalledWith(setPeerError)
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					content: { failure: { code: -1, message: 'Serialized error' } },
				}),
				mockOrigin,
			)
		})

		it('should send error response when encryption fails', async () => {
			// Arrange
			const encryptError = new Error('Failed to encrypt response')
			;(encryptContent as Mock).mockRejectedValueOnce(encryptError)

			const _popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b8D1D8c8D7C94b5b8B']),
			})

			// Act
			const messageEvent = {
				data: mockHandshakeMessage,
				origin: mockOrigin,
				source: window.opener,
			} as MessageEvent<RPCRequestMessage>

			const messageHandler = mockAddEventListener.mock.calls.find(
				call => call[0] === 'message',
			)?.[1] as EventListener

			await messageHandler(messageEvent)

			// Assert
			expect(encryptContent).toHaveBeenCalledWith({ result: { value: 'handshake_complete' } }, mockCryptoKey)
			expect(serializeError).toHaveBeenCalledWith(encryptError)
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					content: { failure: { code: -1, message: 'Serialized error' } },
				}),
				mockOrigin,
			)
		})

		it('should ignore non-handshake messages', async () => {
			// Arrange
			const nonHandshakeMessage = {
				id: mockRequestId,
				correlationId: undefined,
				requestId: mockRequestId,
				sender: mockPublicKey,
				content: { other: { method: 'other' } },
				timestamp: new Date(),
			} as any as RPCRequestMessage

			const _popup = new SAManagerPopup({
				chainId: 1n,
				walletRequestHandler: vi.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b8D1D8c8D7C94b5b8B']),
			})

			// Act
			const messageEvent = {
				data: nonHandshakeMessage,
				origin: mockOrigin,
				source: window.opener,
			} as MessageEvent<RPCRequestMessage>

			const messageHandler = mockAddEventListener.mock.calls.find(
				call => call[0] === 'message',
			)?.[1] as EventListener

			await messageHandler(messageEvent)

			// Assert - no handshake-related calls should be made
			expect(importKeyFromHexString).not.toHaveBeenCalled()
			expect(mockKeyManager.setPeerPublicKey).not.toHaveBeenCalled()
			expect(encryptContent).not.toHaveBeenCalled()
		})
	})
})
