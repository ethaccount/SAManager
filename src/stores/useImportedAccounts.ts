import { CHAIN_ID } from '@/lib/network'
import { AccountId } from '@/lib/account'
import { defineStore, storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'

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
