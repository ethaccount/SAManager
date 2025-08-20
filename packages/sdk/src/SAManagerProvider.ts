import { Communicator } from './Communicator'
import { DEFAULT_ORIGIN } from './constants'
import { correlationIds } from './correlationIds'
import { standardErrors } from './error'
import { KeyManager } from './KeyManager'
import type { RPCRequestMessage, RPCResponse, RPCResponseMessage } from './message'
import type { EthRequestAccountsResponse } from './rpc'
import type { Address, ProviderEventMap, ProviderInterface, RequestArguments } from './types'
import { decryptContent, encryptContent, exportKeyToHexString, importKeyFromHexString } from './utils'

export type ProviderEventCallback = ProviderInterface['emit']

export type SAManagerProviderOptions = {
	chainId: bigint
	origin?: string
	callback?: ProviderEventCallback
}

export function announceSAManagerProvider({ chainId, origin, callback }: SAManagerProviderOptions) {
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
				}),
			},
		}),
	)
}

export class SAManagerProvider implements ProviderInterface {
	private readonly communicator: Communicator
	private readonly keyManager: KeyManager
	private callback: ProviderEventCallback | undefined

	private accounts: Address[]
	private chainId: bigint

	constructor({ chainId, origin = DEFAULT_ORIGIN, callback }: SAManagerProviderOptions) {
		this.chainId = chainId
		this.communicator = new Communicator(origin + '/' + this.chainId.toString() + '/connect')
		this.keyManager = new KeyManager()
		this.callback = callback
		this.accounts = []
	}

	/**
	 * request() → handshake() (if needed) → sendRequestToPopup()
	 * sendRequestToPopup: sendEncryptedRequest() -> decryptResponseMessage() → handleResponse()
	 */
	async request(request: RequestArguments) {
		// Checks if a shared secret exists. If not, it will perform a handshake
		const sharedSecret = await this.keyManager.getSharedSecret()
		if (!sharedSecret) {
			await this.handshake(request)
		}

		switch (request.method) {
			case 'eth_requestAccounts': {
				await this.sendRequestToPopup(request)
				return this.accounts
			}
			default:
				throw standardErrors.provider.unauthorized()
		}
	}

	async disconnect(): Promise<void> {
		// TODO: Implement wallet disconnect logic
		console.log('disconnect called')
	}

	emit<K extends keyof ProviderEventMap>(event: K, payload: ProviderEventMap[K]): void {
		// TODO: Implement event emission logic
		console.log('emit', event, payload)
	}

	on<K extends keyof ProviderEventMap>(event: K, handler: (payload: ProviderEventMap[K]) => void): void {
		console.log('on', event, handler)
		// TODO: Implement event listener registration
	}

	removeListener<K extends keyof ProviderEventMap>(event: K, handler: (payload: ProviderEventMap[K]) => void): void {
		console.log('removeListener', event, handler)
		// TODO: Implement event listener removal
	}

	// =============================== PRIVATE METHODS ===============================

	private updateChain(chainId: bigint): boolean {
		if (chainId !== this.chainId) {
			this.chainId = chainId
			this.callback?.('chainChanged', chainId.toString(16))
		}
		return true
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
		} catch (error) {
			throw error
		}
	}

	private async sendRequestToPopup(request: RequestArguments) {
		// Open the popup before constructing the request message.
		// This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
		await this.communicator.waitForPopupLoaded?.()

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
		const encrypted = await encryptContent(
			{
				action: request,
				chainId: this.chainId,
			},
			sharedSecret,
		)

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
			default:
				break
		}
		return result.value
	}
}
