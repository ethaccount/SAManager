import type { Mock, Mocked } from 'vitest'
import { Communicator } from './Communicator'
import { SAManagerProvider, type ProviderEventCallback } from './SAManagerProvider'
import { KeyManager } from './KeyManager'
import type { EncryptedData, RPCResponseMessage } from './message'
import { decryptContent, encryptContent, exportKeyToHexString } from './utils'
import { importKeyFromHexString } from './utils'
import { correlationIds } from './correlationIds'

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
		;(importKeyFromHexString as Mock).mockResolvedValue(mockCryptoKey)
		;(exportKeyToHexString as Mock).mockResolvedValueOnce('0xPublicKey')
		mockKeyManager.getSharedSecret.mockResolvedValue(mockCryptoKey)
		;(encryptContent as Mock).mockResolvedValueOnce(encryptedData)
		vi.spyOn(correlationIds, 'get').mockReturnValue(mockCorrelationId)

		provider = new SAManagerProvider({
			chainId: 1n,
			communicator: mockCommunicator,
			callback: mockCallback,
		})
	})

	afterEach(async () => {
		vi.clearAllMocks()
	})

	describe('handshake', () => {
		it('should perform a successful handshake for eth_requestAccounts', async () => {
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: ['0xAddress'],
				},
			})

			const accounts = await provider.request({ method: 'eth_requestAccounts' })

			expect(accounts).toEqual(['0xAddress'])
		})
	})
})
