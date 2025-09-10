import type { SerializedEthereumRpcError } from '../error/utils'

export type RPCResponse = {
	result:
		| {
				value: unknown // JSON-RPC result
		  }
		| {
				error: SerializedEthereumRpcError
		  }
	data: {
		chainId: number
	}
}
