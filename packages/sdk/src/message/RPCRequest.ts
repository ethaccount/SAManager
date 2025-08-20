import type { RequestArguments } from '../types'

export type RPCRequest = {
	action: RequestArguments // JSON-RPC call
	chainId: bigint
}
