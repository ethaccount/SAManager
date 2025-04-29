import { defineStore, storeToRefs } from 'pinia'
import { EntryPointVersion } from 'sendop'

export enum AccountId {
	'kernel.advanced.v0.3.1',
	'biconomy.nexus.1.0.2',
	'rhinestone.safe7579.v1.0.0',
	'infinitism.Simple7702Account.0.8.0',
	'infinitism.SimpleAccount.0.8.0',
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

export type ImportedAccount = {
	type: 'Smart Account' | 'Smart EOA'
	address: string
	chainId: bigint
	vOptions: ValidationOption[]
	accountId: AccountId
	initCode: string | null
}

export type ValidationOption = {
	type: 'EOA' | 'Passkey'
	publicKey: string
}

export const useImportedAccountsStore = defineStore('useImportedAccountsStore', () => {
	const accounts = ref<ImportedAccount[]>([
		{
			type: 'Smart Account',
			address: '0x0000000000000000000000000000000000000000',
			chainId: 11155111n,
			vOptions: [],
			accountId: AccountId['kernel.advanced.v0.3.1'],
			initCode: null,
		},
	])
	const hasAccounts = computed(() => accounts.value.length > 0)

	return {
		accounts,
		hasAccounts,
	}
})

export function useImportedAccounts() {
	const store = useImportedAccountsStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
