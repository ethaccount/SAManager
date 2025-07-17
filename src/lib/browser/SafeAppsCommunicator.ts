import { MessageFormatter } from './messageFormatter'
import { ErrorResponse, MethodToResponse, Methods, RPCPayload, RequestId, SDKMessageEvent } from './types'
import { getSDKVersion } from './utils'

type MessageHandler = (
	msg: SDKMessageEvent,
) => void | MethodToResponse[Methods] | ErrorResponse | Promise<MethodToResponse[Methods] | ErrorResponse | void>

export enum LegacyMethods {
	getEnvInfo = 'getEnvInfo',
}

type SDKMethods = Methods | LegacyMethods

export class SafeAppsCommunicator {
	private iframeEl: HTMLIFrameElement
	private handlers = new Map<SDKMethods, MessageHandler>()

	constructor(iframeEl: HTMLIFrameElement) {
		this.iframeEl = iframeEl

		window.addEventListener('message', this.handleIncomingMessage)
	}

	on = (method: SDKMethods, handler: MessageHandler): void => {
		this.handlers.set(method, handler)
	}

	private isValidMessage = (msg: SDKMessageEvent): boolean => {
		if (msg.data.hasOwnProperty('isCookieEnabled')) {
			return true
		}

		const sentFromIframe = this.iframeEl?.contentWindow === msg.source
		const knownMethod = Object.values(Methods).includes(msg.data.method)

		return sentFromIframe && knownMethod
	}

	private canHandleMessage = (msg: SDKMessageEvent): boolean => {
		return Boolean(this.handlers.get(msg.data.method))
	}

	// RPC methods that should not be logged
	private silentRpcMethods = new Set(['eth_getBlockByNumber', 'eth_getTransactionCount', 'eth_getCode', 'eth_call'])

	private count = 0
	private shouldLogMessage = (msg: SDKMessageEvent): boolean => {
		// only log once for getSafeInfo
		if (msg.data.method === Methods.getSafeInfo) {
			this.count++
			return this.count < 2
		}

		if (msg.data.method === Methods.rpcCall) {
			const params = msg.data.params as RPCPayload
			return !this.silentRpcMethods.has(params.call)
		}
		return true
	}

	send = (data: unknown, requestId: RequestId, error = false, shouldLog = true): void => {
		const sdkVersion = getSDKVersion()
		const msg = error
			? MessageFormatter.makeErrorResponse(requestId, data as string, sdkVersion)
			: MessageFormatter.makeResponse(requestId, data, sdkVersion)

		if (shouldLog) {
			// console.log('send', msg)
		}

		this.iframeEl?.contentWindow?.postMessage(msg, '*')
	}

	handleIncomingMessage = async (msg: SDKMessageEvent): Promise<void> => {
		const validMessage = this.isValidMessage(msg)
		const hasHandler = this.canHandleMessage(msg)

		if (validMessage && hasHandler) {
			const shouldLog = this.shouldLogMessage(msg)

			if (shouldLog) {
				if (msg.data.method === Methods.rpcCall) {
					console.log(
						`incoming: ${(msg.data.params as RPCPayload).call}`,
						(msg.data.params as RPCPayload).params,
					)
				} else {
					console.log(`incoming`, msg.data)
				}
			}

			const handler = this.handlers.get(msg.data.method)
			try {
				// @ts-expect-error Handler existence is checked in this.canHandleMessage
				const response = await handler(msg)

				// If response is not returned, it means the response will be sent somewhere else
				if (typeof response !== 'undefined') {
					this.send(response, msg.data.id, false, shouldLog)
				}
			} catch (err: unknown) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error'
				this.send(errorMessage, msg.data.id, true, shouldLog)
			}
		}
	}

	clear = (): void => {
		window.removeEventListener('message', this.handleIncomingMessage)
	}
}
