import { CHAIN_ID } from '@/config'
import { defineStore, storeToRefs } from 'pinia'
import { EntryPointVersion } from 'sendop'
import { toast } from 'vue-sonner'

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
	[AccountId['rhinestone.safe7579.v1.0.0']]: 'Safe7579 v1.0.0',
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

export type AccountType = 'Smart Account' | 'Smart EOA'

export type ImportedAccount = {
	type: AccountType
	address: string
	chainId: CHAIN_ID
	vOptions: ValidationOption[]
	accountId: AccountId
	initCode: string | null
}

export type ValidationType = 'EOA-Owned' | 'Passkey'

export type ValidationOption = {
	type: ValidationType
	publicKey: string
}

export const useImportedAccountsStore = defineStore(
	'useImportedAccountsStore',
	() => {
		const accounts = ref<ImportedAccount[]>([])
		const hasAccounts = computed(() => accounts.value.length > 0)

		function addAccount(account: Omit<ImportedAccount, 'initCode'>) {
			if (accounts.value.find(a => a.address === account.address)) {
				toast.info('Account already exists')
				return
			}
			accounts.value.push({
				...account,
				initCode: null,
			})
		}

		function removeAccount(account: ImportedAccount) {
			accounts.value = accounts.value.filter(a => a.address !== account.address)
		}

		return {
			accounts,
			hasAccounts,
			addAccount,
			removeAccount,
		}
	},
	{
		persist: {
			pick: ['accounts'],
		},
	},
)

export function useImportedAccounts() {
	const store = useImportedAccountsStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
