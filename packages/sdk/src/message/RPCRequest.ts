import type { RequestArguments } from '../types'

export type RPCRequest = {
	action: RequestArguments // JSON-RPC call
	chainId: number // must be a number for serialization, bigint is not serializable
}
