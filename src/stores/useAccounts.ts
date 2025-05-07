import { AccountId, ImportedAccount } from '@/lib/account'
import { CHAIN_ID } from '@/lib/network'
import { defineStore, storeToRefs } from 'pinia'
import { isSameAddress, KernelV3Account, NexusAccount, Safe7579Account } from 'sendop'
import { toast } from 'vue-sonner'
import { useNetwork } from './useNetwork'
import { useValidation } from './validation/useValidation'

export const useAccountsStore = defineStore(
	'useAccountsStore',
	() => {
		const { isAccountConnected, erc7579Validator } = useValidation()

		const selectedAccount = ref<ImportedAccount | null>(null)

		const isDeployed = computed(() => {
			if (!selectedAccount.value) return false
			return selectedAccount.value.initCode === null
		})

		const accounts = ref<ImportedAccount[]>([])
		const hasAccounts = computed(() => accounts.value.length > 0)

		const opGetter = computed(() => {
			if (!selectedAccount.value || !isAccountConnected.value || !erc7579Validator.value) return null

			const { client, bundler } = useNetwork()

			switch (selectedAccount.value.accountId) {
				case AccountId['kernel.advanced.v0.3.1']:
					return new KernelV3Account({
						address: selectedAccount.value.address,
						client: client.value,
						bundler: bundler.value,
						validator: erc7579Validator.value,
					})
				case AccountId['biconomy.nexus.1.0.2']:
					return new NexusAccount({
						address: selectedAccount.value.address,
						client: client.value,
						bundler: bundler.value,
						validator: erc7579Validator.value,
					})
				case AccountId['rhinestone.safe7579.v1.0.0']:
					return new Safe7579Account({
						address: selectedAccount.value.address,
						client: client.value,
						bundler: bundler.value,
						validator: erc7579Validator.value,
					})
				// case AccountId['infinitism.Simple7702Account.0.8.0']:
				// 	return new Simple7702Account({
				// 		address: selectedAccount.value.address,
				// 		client: client.value,
				// 		bundler: bundler.value,
				// 		validator: validator.value,
				// 	})
				default:
					throw new Error(`opGetter: Unsupported accountId: ${selectedAccount.value.accountId}`)
			}
		})

		function importAccount(account: ImportedAccount | Omit<ImportedAccount, 'initCode'>) {
			// TODO: check all fields are valid
			if (!account.address || !account.chainId || !account.accountId || !account.category) {
				throw new Error(`importAccount: Invalid values: ${JSON.stringify(account)}`)
			}

			if (accounts.value.find(a => isSameAddress(a.address, account.address) && a.chainId === account.chainId)) {
				toast.info('Account already exists')
				return
			}
			accounts.value.push({
				initCode: null,
				...account,
			})

			toast.success('Account imported successfully')

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
			isDeployed,
			accounts,
			hasAccounts,
			opGetter,
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
