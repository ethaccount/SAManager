import type { RequestArguments } from '@/types'
import type { SerializedEthereumRpcError } from '../error/utils'
import type { Message, MessageID } from './Message'

interface RPCMessage extends Message {
	id: MessageID
	correlationId: string | undefined
	sender: string // hex encoded public key of the sender
	content: unknown
	timestamp: Date
}

export type EncryptedData = {
	iv: Uint8Array
	cipherText: ArrayBuffer
}

export interface RPCRequestMessage extends RPCMessage {
	content:
		| {
				handshake: RequestArguments
		  }
		| {
				encrypted: EncryptedData
		  }
}

export interface RPCResponseMessage extends RPCMessage {
	requestId: MessageID
	content:
		| {
				encrypted: EncryptedData
		  }
		| {
				failure: SerializedEthereumRpcError
		  }
}
