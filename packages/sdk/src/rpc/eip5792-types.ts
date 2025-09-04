import type { Address } from '../types'

/**
 * Example:
 *   paymasterService: {
 *     url: "https://...",
 *     optional: true
 *   },
 *   atomic: {
 *     status: "supported"
 *   }
 */
export type Capability = {
	[key: string]: unknown
	optional?: boolean
}

// wallet_sendCalls
export type WalletSendCallsRequest = {
	method: 'wallet_sendCalls'
	params: [
		{
			version: string
			id?: string
			from?: Address
			chainId: string
			atomicRequired: boolean
			calls: Call[]
			capabilities?: Record<string, Capability>
		},
	]
}

export type Call = {
	to?: Address
	data?: string
	value?: string
	capabilities?: Record<string, Capability>
}

export type WalletSendCallsResponse = {
	id: string
	capabilities?: Record<string, unknown>
}

// wallet_getCallsStatus
export type WalletGetCallsStatusRequest = {
	method: 'wallet_getCallsStatus'
	params: [string]
}
export type WalletGetCallsStatusResponse = {
	version: string
	id: string
	chainId: string
	status: number
	atomic: boolean
	receipts?: {
		transactionHash: string
		transactionIndex: string
		from: string
		to: string
		status: string
		logsBloom: string
		blockHash: string
		blockNumber: string
		contractAddress: null | string
		gasUsed: string
		cumulativeGasUsed: string
		effectiveGasPrice: string
		logs: {
			logIndex: string
			transactionIndex: string
			transactionHash: string
			blockHash: string
			blockNumber: string
			address: string
			data: string
			topics: string[]
		}[]
	}[]
	capabilities?: Record<string, unknown>
}

// wallet_showCallsStatus
export type WalletShowCallsStatusRequest = {
	method: 'wallet_showCallsStatus'
	params: [string]
}
export type WalletShowCallsStatusResponse = void

// wallet_getCapabilities
export type WalletGetCapabilitiesRequest = {
	method: 'wallet_getCapabilities'
	params: [Address, string[]?]
}
export type WalletGetCapabilitiesResponse = Record<string, Record<string, unknown>>

// Atomic capability type
export type AtomicCapability = {
	status: 'supported' | 'ready' | 'unsupported'
}
