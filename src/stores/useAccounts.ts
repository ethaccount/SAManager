import { CHAIN_ID } from '@/lib/network'
import { AccountId, checkAccountIsConnected } from '@/lib/account'
import { defineStore, storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import { useEOAWallet } from './useEOAWallet'
import { useVueDapp } from '@vue-dapp/core'
import { isSameAddress } from 'sendop'

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

export const useAccountsStore = defineStore(
	'useAccountsStore',
	() => {
		const selectedAccount = ref<ImportedAccount | null>(null)
		const accounts = ref<ImportedAccount[]>([])
		const hasAccounts = computed(() => accounts.value.length > 0)

		const isConnected = computed(() => {
			if (!selectedAccount.value) return false
			return checkAccountIsConnected(selectedAccount.value)
		})

		function addAccount(account: Omit<ImportedAccount, 'initCode'>) {
			if (accounts.value.find(a => a.address === account.address)) {
				toast.info('Account already exists')
				return
			}
			accounts.value.push({
				...account,
				initCode: null,
			})

			if (accounts.value.length === 1) {
				selectedAccount.value = accounts.value[0]
			}
		}

		function removeAccount(account: ImportedAccount) {
			accounts.value = accounts.value.filter(a => a.address !== account.address)
			if (selectedAccount.value?.address === account.address) {
				if (accounts.value.length > 0) {
					selectedAccount.value = accounts.value[0]
				} else {
					selectedAccount.value = null
				}
			}
		}

		return {
			selectedAccount,
			accounts,
			hasAccounts,
			isConnected,
			addAccount,
			removeAccount,
		}
	},
	{
		persist: {
			pick: ['accounts', 'selectedAccount'],
		},
	},
)

export function useAccounts() {
	const store = useAccountsStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
