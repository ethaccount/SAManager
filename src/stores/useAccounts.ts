import { checkAccountIsConnected, ImportedAccount } from '@/lib/account'
import { CHAIN_ID } from '@/lib/network'
import { defineStore, storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'

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

		function importAccount(account: ImportedAccount | Omit<ImportedAccount, 'initCode'>) {
			// TODO: check all fields are valid
			if (!account.address || !account.chainId || !account.accountId || !account.category) {
				throw new Error(`importAccount: Invalid values: ${JSON.stringify(account)}`)
			}

			if (accounts.value.find(a => a.address === account.address && a.chainId === account.chainId)) {
				toast.info('Account already exists')
				return
			}
			accounts.value.push({
				initCode: null,
				...account,
			})

			if (accounts.value.length === 1) {
				selectedAccount.value = accounts.value[0]
			}
		}

		function selectAccount(address: string, chainId: CHAIN_ID) {
			const account = accounts.value.find(a => a.address === address && a.chainId === chainId)
			if (!account) {
				throw new Error(`selectAccount: Account not found: ${address} ${chainId}`)
			}
			selectedAccount.value = account
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
			importAccount,
			removeAccount,
			selectAccount,
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
