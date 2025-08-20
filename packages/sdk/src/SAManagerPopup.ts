import { serialize, standardErrors } from './error'
import { KeyManager } from './KeyManager'
import type { EncryptedData, RPCRequest, RPCRequestMessage, RPCResponse, RPCResponseMessage } from './message'
import type { RequestArguments } from './types'
import { decryptContent, encryptContent, exportKeyToHexString, importKeyFromHexString } from './utils'

export type WalletRequestHandler = (method: string, params: unknown[]) => Promise<unknown>

export class SAManagerPopup {
	private chainId: bigint
	private readonly keyManager: KeyManager
	private readonly walletRequestHandler: WalletRequestHandler
	private parentOrigin: string | null = null

	constructor({ chainId, walletRequestHandler }: { chainId: bigint; walletRequestHandler: WalletRequestHandler }) {
		this.chainId = chainId
		this.keyManager = new KeyManager()
		this.walletRequestHandler = walletRequestHandler

		this.setupListener()
		// Notify parent that popup is ready to receive messages
		this.notifyParentLoaded()
	}

	/**
	 * Set up message listener for handling communication from parent window
	 */
	private setupListener() {
		window.addEventListener('message', async event => {
			// Store parent origin from first valid message
			if (!this.parentOrigin && this.isValidOrigin(event.origin)) {
				this.parentOrigin = event.origin
			}

			// Validate origin for subsequent messages
			if (!this.isValidOrigin(event.origin)) {
				console.warn('Received message from unauthorized origin:', event.origin)
				return
			}

			const message = event.data as RPCRequestMessage

			try {
				if (this.isHandshakeMessage(message)) {
					await this.handleHandshake(message, event.origin)
				} else if (this.isEncryptedMessage(message)) {
					await this.handleEncryptedRequest(message, event.origin)
				}
			} catch (error) {
				console.error('Error processing message:', error)
				await this.sendErrorResponse(message.id, error, event.origin)
			}
		})
	}

	/**
	 * Handle handshake messages from parent window
	 */
	private async handleHandshake(message: RPCRequestMessage, origin: string) {
		if (!this.isHandshakeMessage(message)) {
			throw standardErrors.rpc.invalidRequest('Invalid handshake message format')
		}

		try {
			// 1. Store peer's (parent's) public key from message sender field
			const peerPublicKey = await importKeyFromHexString('public', message.sender)
			await this.keyManager.setPeerPublicKey(peerPublicKey)

			// 2. Send back encrypted acknowledgment (handshake complete)
			const response = await this.createEncryptedResponse(message.id, {
				result: { value: 'handshake_complete' },
			})
			window.parent.postMessage(response, origin)
		} catch (error) {
			await this.sendErrorResponse(message.id, error, origin)
		}
	}

	/**
	 * Handle encrypted requests from parent window (after handshake is complete)
	 */
	private async handleEncryptedRequest(message: RPCRequestMessage, origin: string) {
		if (!this.isEncryptedMessage(message)) {
			throw standardErrors.rpc.invalidRequest('Invalid encrypted message format')
		}

		try {
			// 1. Decrypt the request content
			const sharedSecret = await this.keyManager.getSharedSecret()
			if (!sharedSecret) {
				throw standardErrors.provider.unauthorized('No shared secret available for decryption')
			}

			const decryptedRequest: RPCRequest = await decryptContent(message.content.encrypted, sharedSecret)

			// 2. Update chain context if needed
			this.updateChain(decryptedRequest.chainId)

			// 3. Process the decrypted request using the provided handler
			const result = await this.walletRequestHandler(
				decryptedRequest.action.method,
				Array.isArray(decryptedRequest.action.params) ? decryptedRequest.action.params : [],
			)

			// 4. Create and send encrypted response
			const response = await this.createEncryptedResponse(message.id, { result: { value: result } })
			window.parent.postMessage(response, origin)
		} catch (error) {
			await this.sendErrorResponse(message.id, error, origin)
		}
	}

	private async createEncryptedResponse(requestId: string, data: RPCResponse): Promise<RPCResponseMessage> {
		const sharedSecret = await this.keyManager.getSharedSecret()
		if (!sharedSecret) {
			throw standardErrors.provider.unauthorized('No shared secret available for encryption')
		}

		const encrypted: EncryptedData = await encryptContent(data, sharedSecret)
		const ownPublicKey = await exportKeyToHexString('public', await this.keyManager.getOwnPublicKey())

		return {
			id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
			correlationId: undefined,
			requestId: requestId as `${string}-${string}-${string}-${string}-${string}`,
			sender: ownPublicKey,
			content: { encrypted },
			timestamp: new Date(),
		}
	}

	private async sendErrorResponse(requestId: string, error: unknown, origin: string) {
		try {
			const ownPublicKey = await exportKeyToHexString('public', await this.keyManager.getOwnPublicKey())
			const errorResponse: RPCResponseMessage = {
				id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
				correlationId: undefined,
				requestId: requestId as `${string}-${string}-${string}-${string}-${string}`,
				sender: ownPublicKey,
				content: { failure: serialize(error) },
				timestamp: new Date(),
			}

			window.parent.postMessage(errorResponse, origin)
		} catch (responseError) {
			console.error('Failed to send error response:', responseError)
		}
	}

	private notifyParentLoaded() {
		// Signal to parent that popup is ready to receive messages
		const loadedMessage = {
			event: 'PopupLoaded',
			id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
			timestamp: new Date(),
		}

		// Use '*' initially since we don't know parent origin yet
		window.parent.postMessage(loadedMessage, '*')
	}

	private updateChain(chainId: bigint): void {
		if (chainId !== this.chainId) {
			this.chainId = chainId
			// In a real implementation, this might trigger UI updates
			console.log('Chain updated to:', chainId.toString())
		}
	}

	private isValidOrigin(origin: string): boolean {
		// TODO: Implement proper origin validation based on your security requirements
		// For development, you might allow localhost origins
		// For production, validate against allowed dApp origins

		// Basic validation - check if it's a valid URL and not empty
		if (!origin || origin === 'null') return false

		try {
			new URL(origin)
			return true
		} catch {
			return false
		}
	}

	private isHandshakeMessage(message: RPCRequestMessage): message is RPCRequestMessage & {
		content: { handshake: RequestArguments }
	} {
		return !!(
			message &&
			typeof message === 'object' &&
			'content' in message &&
			message.content &&
			typeof message.content === 'object' &&
			'handshake' in message.content
		)
	}

	private isEncryptedMessage(message: RPCRequestMessage): message is RPCRequestMessage & {
		content: { encrypted: EncryptedData }
	} {
		return !!(
			message &&
			typeof message === 'object' &&
			'content' in message &&
			message.content &&
			typeof message.content === 'object' &&
			'encrypted' in message.content
		)
	}
}
