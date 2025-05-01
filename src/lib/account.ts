import { useEOAWallet } from '@/stores/useEOAWallet'
import { EntryPointVersion, isSameAddress } from 'sendop'
import { CHAIN_ID } from './network'

export type AccountCategory = 'Smart Account' | 'Smart EOA'

export type ImportedAccount = {
	accountId: AccountId
	category: AccountCategory
	address: string
	chainId: CHAIN_ID
	vOptions: ValidationOption[]
	initCode: string | null
}

export type ValidationType = 'EOA-Owned' | 'Passkey'

export type ValidationOption = {
	type: ValidationType
	publicKey: string
}

export enum AccountId {
	'kernel.advanced.v0.3.1' = 'kernel.advanced.v0.3.1',
	'biconomy.nexus.1.0.2' = 'biconomy.nexus.1.0.2',
	'rhinestone.safe7579.v1.0.0' = 'rhinestone.safe7579.v1.0.0',
	'infinitism.Simple7702Account.0.8.0' = 'infinitism.Simple7702Account.0.8.0',
	'infinitism.SimpleAccount.0.8.0' = 'infinitism.SimpleAccount.0.8.0',
}

export const ACCOUNT_ID_TO_NAME: Record<AccountId, string> = {
	[AccountId['kernel.advanced.v0.3.1']]: 'Kernel v0.3.1',
	[AccountId['biconomy.nexus.1.0.2']]: 'Nexus v1.0.2',
	[AccountId['rhinestone.safe7579.v1.0.0']]: 'Safe7579 v1',
	[AccountId['infinitism.Simple7702Account.0.8.0']]: 'Simple7702Account v0.8',
	[AccountId['infinitism.SimpleAccount.0.8.0']]: 'SimpleAccount v0.8',
}

export const SUPPORTED_ACCOUNTS: Record<
	AccountId,
	{
		supportedEps: EntryPointVersion[]
		isModular: boolean
	}
> = {
	[AccountId['kernel.advanced.v0.3.1']]: {
		supportedEps: ['v0.7'],
		isModular: true,
	},
	[AccountId['biconomy.nexus.1.0.2']]: {
		supportedEps: ['v0.7'],
		isModular: true,
	},
	[AccountId['rhinestone.safe7579.v1.0.0']]: {
		supportedEps: ['v0.7'],
		isModular: true,
	},
	[AccountId['infinitism.SimpleAccount.0.8.0']]: {
		supportedEps: ['v0.8'],
		isModular: false,
	},
	[AccountId['infinitism.Simple7702Account.0.8.0']]: {
		supportedEps: ['v0.8'],
		isModular: false,
	},
}

export function displayAccountName(accountId: AccountId) {
	return ACCOUNT_ID_TO_NAME[accountId]
}

export function checkAccountIsConnected(account: ImportedAccount) {
	if (!account) return false

	if (account.category === 'Smart Account') {
		const { signer } = useEOAWallet()
		if (signer.value?.address) {
			if (isSameAddress(signer.value.address, account.address)) {
				return true
			}
		}
	}

	const vOptions = account.vOptions
	for (const vOption of vOptions) {
		switch (vOption.type) {
			case 'EOA-Owned':
				const { signer } = useEOAWallet()
				if (signer.value?.address) {
					if (isSameAddress(signer.value.address, vOption.publicKey)) {
						return true
					}
				}
				break
			case 'Passkey':
				// TODO: Implement passkey isConnected
				return false
		}
	}

	return false
}
