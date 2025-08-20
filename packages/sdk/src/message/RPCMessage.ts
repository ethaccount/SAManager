import type { SerializedEthereumRpcError } from '../error/utils'
import type { RequestArguments } from '../types'
import type { Message, MessageID } from './Message'

// protocol level messages
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

// protocol level request messages
export interface RPCRequestMessage extends RPCMessage {
	content:
		| {
				handshake: RequestArguments
		  }
		| {
				encrypted: EncryptedData
		  }
}

// protocol level response messages
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
