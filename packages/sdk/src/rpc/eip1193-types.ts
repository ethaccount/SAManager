import type { Address } from '../types'

// eth_requestAccounts
export type EthRequestAccountsRequest = {
	method: 'eth_requestAccounts'
}
export type EthRequestAccountsResponse = Address[]

// eth_accounts
export type EthAccountsRequest = {
	method: 'eth_accounts'
}
export type EthAccountsResponse = Address[]

// eth_chainId
export type EthChainIdRequest = {
	method: 'eth_chainId'
}
export type EthChainIdResponse = string

// eth_getBlockByNumber
export type EthGetBlockByNumberRequest = {
	method: 'eth_getBlockByNumber'
	params: [blockNumber: string, includeTransactions: boolean]
}
export type EthGetBlockByNumberResponse = {
	number: string
	hash: string
	parentHash: string
	timestamp: string
	gasLimit: string
	gasUsed: string
	transactions: unknown[]
	[key: string]: unknown
}

// eth_sendTransaction
export type EthSendTransactionRequest = {
	method: 'eth_sendTransaction'
	params: [
		{
			from: Address
			to?: Address
			value?: string
			gas?: string
			gasPrice?: string
			data?: string
			nonce?: string
			[key: string]: unknown
		},
	]
}
export type EthSendTransactionResponse = string

// eth_subscribe
export type EthSubscribeRequest = {
	method: 'eth_subscribe'
	params: [subscriptionType: string, ...args: unknown[]]
}
export type EthSubscribeResponse = string

// eth_unsubscribe
export type EthUnsubscribeRequest = {
	method: 'eth_unsubscribe'
	params: [subscriptionId: string]
}
export type EthUnsubscribeResponse = boolean
