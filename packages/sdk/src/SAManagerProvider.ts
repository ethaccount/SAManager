import type { Communicator } from './Communicator'
import { correlationIds } from './correlationIds'
import { standardErrors } from './error'
import { KeyManager } from './KeyManager'
import type { RPCRequestMessage, RPCResponse, RPCResponseMessage } from './message'
import type { EthRequestAccountsResponse } from './rpc/eth_requestAccounts'
import type { Address, ProviderEventMap, ProviderInterface, RequestArguments } from './types'
import { decryptContent, encryptContent, exportKeyToHexString, importKeyFromHexString } from './utils'

export type ProviderEventCallback = ProviderInterface['emit']

export class SAManagerProvider implements ProviderInterface {
	private readonly communicator: Communicator
	private readonly keyManager: KeyManager
	private callback: ProviderEventCallback | null

	private accounts: Address[]
	private chainId: bigint

	constructor({
		chainId,
		communicator,
		callback,
	}: {
		chainId: bigint
		communicator: Communicator
		callback: ProviderEventCallback | null
	}) {
		this.chainId = chainId
		this.communicator = communicator
		this.keyManager = new KeyManager()
		this.callback = callback
		this.accounts = []
	}

	async request(request: RequestArguments) {
		const correlationId = correlationIds.get(request)
		console.log('[SAManagerProvider#request]', { method: request.method, correlationId })

		try {
			const result = await this._request(request)
			return result
		} catch (error) {
			throw error
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

	async _request(request: RequestArguments) {
		// Check if we need to handshake first
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

	private async handshake(args: RequestArguments) {
		const correlationId = correlationIds.get(args)

		try {
			// Open the popup before constructing the request message.
			// This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
			await this.communicator.waitForPopupLoaded?.()

			const handshakeMessage = await this.createRequestMessage(
				{
					handshake: {
						method: args.method,
						params: args.params ?? [],
					},
				},
				correlationId,
			)
			const response: RPCResponseMessage = await this.communicator.postRequestAndWaitForResponse(handshakeMessage)

			// store peer's public key
			if ('failure' in response.content) {
				throw response.content.failure
			}

			const peerPublicKey = await importKeyFromHexString('public', response.sender)
			await this.keyManager.setPeerPublicKey(peerPublicKey)

			const decrypted = await this.decryptResponseMessage(response)

			this.handleResponse(args, decrypted)
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
		const sharedSecret = await this.keyManager.getSharedSecret()
		if (!sharedSecret) {
			throw standardErrors.provider.unauthorized('No shared secret found when encrypting request')
		}

		const encrypted = await encryptContent(
			{
				action: request,
				chainId: this.chainId,
			},
			sharedSecret,
		)
		const correlationId = correlationIds.get(request)
		const message = await this.createRequestMessage({ encrypted }, correlationId)

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
			throw standardErrors.provider.unauthorized(
				'Invalid session: no shared secret found when decrypting response',
			)
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
