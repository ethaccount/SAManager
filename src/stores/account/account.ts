import { AccountId } from '@/lib/accounts'
import { ValidationMethodData } from '@/lib/validations/types'
import { CHAIN_ID } from '@/stores/blockchain/chains'
import { isSameAddress } from 'sendop'

export type ImportedAccount = {
	accountId: AccountId
	category: AccountCategory
	address: string
	chainId: CHAIN_ID
	vMethods: ValidationMethodData[]

	// deprecated
	vOptions?: {
		type: 'EOA-Ownable' | 'Passkey'
		identifier: string
	}[]
}

export type AccountCategory = 'Smart Account' | 'Smart EOA'

export function isSameAccount(a: ImportedAccount, b: ImportedAccount) {
	return isSameAddress(a.address, b.address) && a.chainId === b.chainId
}
