import type { Address } from '@/types'

export type EthRequestAccountsRequest = {
	method: 'eth_requestAccounts'
}

export type EthRequestAccountsResponse = Address[]
