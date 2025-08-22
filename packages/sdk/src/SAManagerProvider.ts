import { Communicator } from './Communicator'
import { DEFAULT_ORIGIN } from './constants'
import { correlationIds } from './correlationIds'
import { standardErrors } from './error'
import { KeyManager } from './KeyManager'
import type { EncryptedData, RPCRequestMessage, RPCResponse, RPCResponseMessage } from './message'
import type { EthRequestAccountsResponse } from './rpc'
import type { Address, ProviderEventMap, ProviderInterface, RequestArguments } from './types'
import { bigIntToHex, decryptContent, encryptContent, exportKeyToHexString, importKeyFromHexString } from './utils'

const SUPPORTED_CHAIN_IDS = [
	// Mainnet
	'1', // ETHEREUM
	'8453', // BASE
	// '42161', // ARBITRUM
	// '10', // OPTIMISM
	// '137', // POLYGON

	// Testnet
	'11155111', // SEPOLIA
	'84532', // BASE_SEPOLIA
	'421614', // ARBITRUM_SEPOLIA
	'11155420', // OPTIMISM_SEPOLIA
	'80002', // POLYGON_AMOY
] as const

export type ProviderEventCallback = ProviderInterface['emit']

export type SAManagerProviderOptions = {
	chainId: bigint
	origin?: string
	callback?: ProviderEventCallback
	debug?: boolean
}

export class SAManagerProvider implements ProviderInterface {
	private readonly communicator: Communicator
	private readonly keyManager: KeyManager
	private callback: ProviderEventCallback | undefined
	private debug: boolean

	private accounts: Address[]
	private chainId: bigint

	constructor({ chainId, origin = DEFAULT_ORIGIN, callback, debug = false }: SAManagerProviderOptions) {
		// Check if the chainId is supported in SAManager
		if (!SUPPORTED_CHAIN_IDS.includes(chainId.toString() as any)) {
			throw standardErrors.provider.unsupportedChain(
				`Unsupported chainId: ${chainId}. Supported chainIds: ${SUPPORTED_CHAIN_IDS.join(', ')}`,
			)
		}
		this.chainId = chainId
		this.communicator = new Communicator({
			url: origin + '/' + this.chainId.toString() + '/connect',
			onDisconnect: () => this.handlePopupDisconnect(),
			debug,
		})
		this.keyManager = new KeyManager()
		this.callback = callback
		this.debug = debug
		this.accounts = []
		if (debug) this.log('SAManagerProvider initialized')
	}

	/**
	 * request() → handshake() (if needed) → sendRequestToPopup()
	 * sendRequestToPopup: sendEncryptedRequest() -> decryptResponseMessage() → handleResponse()
	 */
	async request(request: RequestArguments) {
		this.log('request', request)

		// // Handle methods that don't require popup/encryption
		switch (request.method) {
			case 'eth_chainId': {
				// Direct return the chainId set in the constructor
				return this.handleResponse(request, {
					result: {
						value: bigIntToHex(this.chainId),
					},
				})
			}
		}

		try {
			// Checks if a shared secret exists. If not, it will perform a handshake
			const sharedSecret = await this.keyManager.getSharedSecret()
			if (!sharedSecret) {
				this.log('handshake needed')
				await this.handshake(request)
			} else {
				this.log('handshake not needed')
			}

			let result: unknown

			switch (request.method) {
				case 'eth_requestAccounts': {
					await this.sendRequestToPopup(request)
					result = this.accounts
					break
				}
				default:
					result = await this.sendRequestToPopup(request)
			}

			this.log('request completed', result)

			return result
		} catch (error) {
			throw error
		} finally {
			// Make sure the popup is disconnected even when the request fails
			this.communicator.disconnect()
		}
	}

	async disconnect(): Promise<void> {
		// TODO: Implement wallet disconnect logic
		this.log('disconnect called')
		this.accounts = []
	}

	emit<K extends keyof ProviderEventMap>(event: K, payload: ProviderEventMap[K]): void {
		// TODO: Implement event emission logic
		this.log('emit:', event, payload)
	}

	on<K extends keyof ProviderEventMap>(event: K, handler: (payload: ProviderEventMap[K]) => void): void {
		this.log('on:', event)
		// TODO: Implement event listener registration
	}

	removeListener<K extends keyof ProviderEventMap>(event: K, handler: (payload: ProviderEventMap[K]) => void): void {
		this.log('removeListener:', event)
		// TODO: Implement event listener removal
	}

	// =============================== PRIVATE METHODS ===============================

	private log(...args: any[]): void {
		if (this.debug) {
			console.log('[SAManagerProvider]', ...args)
		}
	}

	private updateChain(chainId: bigint): boolean {
		if (chainId !== this.chainId) {
			this.chainId = chainId
			this.callback?.('chainChanged', bigIntToHex(chainId))
		}
		return true
	}

	/**
	 * Handle popup disconnect - clear shared secret and reset state
	 */
	private handlePopupDisconnect(): void {
		this.log('handlePopupDisconnect: popup disconnected, clearing shared secret')
		this.keyManager.clear()
	}

	private async handshake(request: RequestArguments) {
		const correlationId = correlationIds.get(request)

		try {
			// 1. Wait for popup to load
			// Open the popup before constructing the request message.
			// This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
			await this.communicator.waitForPopupLoaded?.()

			// 2. Create handshake message with original request embedded
			const handshakeMessage = await this.createRequestMessage(
				{
					handshake: {
						method: request.method,
						params: request.params ?? [],
					},
				},
				correlationId,
			)

			// 3. Send handshake (includes our public key in sender field)
			const response: RPCResponseMessage = await this.communicator.postRequestAndWaitForResponse(handshakeMessage)

			// store peer's public key
			if ('failure' in response.content) {
				throw response.content.failure
			}

			// 4. Extract peer's public key from response.sender
			const peerPublicKey = await importKeyFromHexString('public', response.sender)
			await this.keyManager.setPeerPublicKey(peerPublicKey)
			this.log('handshake completed')
		} catch (error) {
			throw error
		}
	}

	private async sendRequestToPopup(request: RequestArguments) {
		this.log('sendRequestToPopup')

		// Open the popup before constructing the request message.
		// This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
		await this.communicator.waitForPopupLoaded?.()

		this.log('sendRequestToPopup: sendEncryptedRequest')
		const response = await this.sendEncryptedRequest(request)
		const decrypted = await this.decryptResponseMessage(response)
		return this.handleResponse(request, decrypted)
	}

	private async sendEncryptedRequest(request: RequestArguments): Promise<RPCResponseMessage> {
		// 1. Get shared secret (derived from key exchange)
		const sharedSecret = await this.keyManager.getSharedSecret()
		if (!sharedSecret) {
			throw standardErrors.provider.unauthorized('No shared secret found when encrypting request')
		}

		// 2. Encrypt the actual request + chain context
		let encrypted: EncryptedData
		try {
			encrypted = await encryptContent(
				{
					action: request,
					chainId: Number(this.chainId),
				},
				sharedSecret,
			)
		} catch (error) {
			throw new Error('Failed to encrypt request', { cause: error })
		}

		// 3. Wrap in message structure
		const correlationId = correlationIds.get(request)
		const message = await this.createRequestMessage({ encrypted }, correlationId)

		// 4. Send to popup
		return this.communicator.postRequestAndWaitForResponse(message)
	}

	private async createRequestMessage(
		content: RPCRequestMessage['content'],
		correlationId: string | undefined,
	): Promise<RPCRequestMessage> {
		const publicKey = await exportKeyToHexString('public', await this.keyManager.getOwnPublicKey())

		return {
			target: 'samanager',
			id: crypto.randomUUID(),
			correlationId,
			sender: publicKey,
			content,
			timestamp: new Date(),
		}
	}

	private async decryptResponseMessage(message: RPCResponseMessage): Promise<RPCResponse> {
		const content = message.content

		// throw protocol level error
		if ('failure' in content) {
			throw content.failure
		}

		const sharedSecret = await this.keyManager.getSharedSecret()
		if (!sharedSecret) {
			throw standardErrors.provider.unauthorized('No shared secret found when decrypting response')
		}

		const response: RPCResponse = await decryptContent(content.encrypted, sharedSecret)

		return response
	}

	private async handleResponse(request: RequestArguments, decrypted: RPCResponse) {
		const result = decrypted.result

		if ('error' in result) throw result.error

		switch (request.method) {
			case 'eth_requestAccounts': {
				const accounts = result.value as EthRequestAccountsResponse
				this.accounts = accounts
				this.callback?.('accountsChanged', accounts)
				break
			}
		}

		return result.value
	}
}

export function announceSAManagerProvider({ chainId, origin, callback, debug }: SAManagerProviderOptions) {
	window.dispatchEvent(
		new CustomEvent('eip6963:announceProvider', {
			detail: {
				info: {
					uuid: crypto.randomUUID(),
					name: 'SAManager',
					icon: 'https://samanager.xyz/favicon_io/favicon-32x32.png',
					rdns: 'xyz.samanager',
				},
				provider: new SAManagerProvider({
					chainId,
					origin,
					callback,
					debug,
				}),
			},
		}),
	)
}
