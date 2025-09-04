import { Communicator } from './Communicator'
import { DEFAULT_ORIGIN, ICON_DATA_URI } from './constants'
import { correlationIds } from './correlationIds'
import { deserializeError, standardErrors } from './error'
import { KeyManager } from './KeyManager'
import type { EncryptedData, RPCRequest, RPCRequestMessage, RPCResponse, RPCResponseMessage } from './message'
import type { EthRequestAccountsResponse } from './rpc'
import { handleGetCallsStatus } from './rpc/wallet_getCallStatus'
import type { Address, ProviderEventMap, ProviderInterface, RequestArguments } from './types'
import { decryptContent, encryptContent, exportKeyToHexString, importKeyFromHexString, toChainIdHex } from './utils'

export type ProviderEventCallback = ProviderInterface['emit']

export type SAManagerProviderOptions = {
	origin?: string
	debug?: boolean
}

export class SAManagerProvider implements ProviderInterface {
	private readonly communicator: Communicator
	private readonly keyManager: KeyManager
	private debug: boolean
	private eventHandlers: Map<keyof ProviderEventMap, Set<(payload: any) => void>> = new Map()

	private accounts: Address[]
	private chainId: number = 0 // chainId default to zero
	private origin: string

	constructor(options?: SAManagerProviderOptions) {
		const { origin = DEFAULT_ORIGIN, debug = false } = options ?? {}

		this.origin = origin
		this.communicator = new Communicator({
			url: origin + '/connect',
			onDisconnect: () => this.handlePopupDisconnect(),
			debug,
		})
		this.keyManager = new KeyManager()
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

		// Handle methods that don't require popup
		switch (request.method) {
			case 'eth_chainId': {
				// If the chainId is set, direct return the chainId, or call the popup to get the chainId as below
				if (this.chainId) {
					// Direct return the chainId
					return toChainIdHex(this.chainId)
				}
				break
			}
			case 'wallet_getCallsStatus': {
				return await handleGetCallsStatus(request, this.origin)
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
				case 'eth_chainId':
				case 'eth_getBlockByNumber':
				case 'wallet_switchEthereumChain': {
					result = await this.sendRequestToPopup(request)
					break
				}
				case 'eth_requestAccounts': {
					result = await this.sendRequestToPopup(request)
					// Update accounts in the provider
					this.updateAccounts(result as EthRequestAccountsResponse)
					break
				}

				case 'wallet_getCapabilities':
				case 'wallet_sendCalls':
				case 'wallet_showCallsStatus': {
					// Check if there is an account connected
					if (!this.hasAccount()) {
						throw standardErrors.provider.disconnected('No account found. Please connect wallet.')
					}
					result = await this.sendRequestToPopup(request)
					break
				}

				default:
					throw standardErrors.provider.unsupportedMethod(`Unsupported method: ${request.method}`)
			}

			this.log('Popup request completed', result)

			return result
		} catch (error) {
			throw error
		} finally {
			// Make sure the popup is disconnected even when the request fails
			this.communicator.disconnect()
		}
	}

	// Dapp will call this method when the user disconnects the wallet
	async disconnect(): Promise<void> {
		this.log('disconnect called')
		this.updateAccounts([])
	}

	emit<K extends keyof ProviderEventMap>(event: K, payload: ProviderEventMap[K]): void {
		this.log('emit:', event, payload)
		const handlers = this.eventHandlers.get(event)
		if (handlers) {
			handlers.forEach(handler => handler(payload))
		}
	}

	on<K extends keyof ProviderEventMap>(event: K, handler: (payload: ProviderEventMap[K]) => void): void {
		this.log('on:', event)
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, new Set())
		}
		this.eventHandlers.get(event)?.add(handler)
	}

	removeListener<K extends keyof ProviderEventMap>(event: K, handler: (payload: ProviderEventMap[K]) => void): void {
		this.log('removeListener:', event)
		const handlers = this.eventHandlers.get(event)
		if (handlers) {
			handlers.delete(handler)
		}
	}

	// =============================== PRIVATE METHODS ===============================

	private log(...args: any[]): void {
		if (this.debug) {
			console.log('[SAManagerProvider]', ...args)
		}
	}

	private updateAccounts(accounts: Address[]): void {
		this.accounts = accounts
		this.emit('accountsChanged', accounts)
	}

	private updateChainId(chainId: number): void {
		if (chainId === this.chainId) return
		this.chainId = chainId
		this.emit('chainChanged', toChainIdHex(chainId))
	}

	private hasAccount(): boolean {
		return this.accounts.length > 0
	}

	/**
	 * Handle popup disconnect - clear shared secret
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
				throw deserializeError(response.content.failure)
			}

			// 4. Extract peer's public key from response.sender
			const peerPublicKey = await importKeyFromHexString('public', response.sender)
			await this.keyManager.setPeerPublicKey(peerPublicKey)

			// 5. Decrypt the response to get the chainId
			const decryptedResponse = await this.decryptResponseMessage(response)
			this.updateChainId(decryptedResponse.data.chainId)

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

		const rpcRequest: RPCRequest = {
			action: request,
		}

		let encrypted: EncryptedData
		try {
			encrypted = await encryptContent(rpcRequest, sharedSecret)
		} catch (error) {
			throw new Error('Error encrypting request', { cause: error })
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
			throw deserializeError(content.failure)
		}

		const sharedSecret = await this.keyManager.getSharedSecret()
		if (!sharedSecret) {
			throw standardErrors.provider.unauthorized('No shared secret found when decrypting response')
		}

		return await decryptContent(content.encrypted, sharedSecret)
	}

	private async handleResponse(_request: RequestArguments, decrypted: RPCResponse) {
		if (!decrypted || !decrypted.result) {
			throw standardErrors.rpc.internal('Invalid response structure from popup')
		}

		const result = decrypted.result
		if ('error' in result) throw deserializeError(result.error)
		// Update chainId in every response
		this.updateChainId(decrypted.data.chainId)
		return result.value
	}
}

export function announceSAManagerProvider({ origin, debug }: SAManagerProviderOptions) {
	window.dispatchEvent(
		new CustomEvent('eip6963:announceProvider', {
			detail: {
				info: {
					uuid: crypto.randomUUID(),
					name: 'SAManager',
					icon: ICON_DATA_URI,
					rdns: 'xyz.samanager',
				},
				provider: new SAManagerProvider({
					origin,
					debug,
				}),
			},
		}),
	)
}
