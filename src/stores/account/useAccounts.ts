import { deserializeValidationMethod, ValidationMethod, ValidationMethodName } from '@/lib/validations'
import { ImportedAccount, isSameAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useInitCode } from '@/stores/account/useInitCode'
import { CHAIN_ID } from '@/stores/blockchain/chains'
import { JSONParse, JSONStringify } from 'json-with-bigint'
import { isSameAddress } from 'sendop'
import { useSigner } from '../useSigner'

export const useAccountsStore = defineStore(
	'useAccountsStore',
	() => {
		const { addInitCode, removeInitCode } = useInitCode()
		const { selectedAccount } = useAccount()

		const accounts = ref<ImportedAccount[]>([])

		const hasAccounts = computed(() => accounts.value.length > 0)

		function importAccount(account: ImportedAccount, initCode?: string) {
			if (!account.address || !account.chainId || !account.accountId || !account.category) {
				throw new Error(`importAccount: Invalid values: ${JSON.stringify(account)}`)
			}

			// should have at least one vMethod
			if (!account.vMethods || account.vMethods.length === 0) {
				throw new Error(`importAccount: No validation methods`)
			}

			if (accounts.value.some(a => isSameAccount(a, account))) {
				console.log('Account already imported', account)
				return
			}

			accounts.value.push({
				...account,
			})

			if (initCode) {
				if (account.vMethods.length > 1) {
					throw new Error(`importAccount: Multiple vMethods are not supported with init code`)
				}
				addInitCode({
					address: account.address,
					initCode,
					vMethod: account.vMethods[0],
				})
			}

			console.log('Account imported', account)

			if (accounts.value.length === 1) {
				selectedAccount.value = accounts.value[0]
			}
		}

		function removeAccount(account: ImportedAccount) {
			accounts.value = accounts.value.filter(a => !isSameAccount(a, account))

			// remove the init code for the account
			removeInitCode(account.address)

			// if the selected account is the one being removed, select the first account in the list
			if (selectedAccount.value && isSameAccount(selectedAccount.value, account)) {
				if (accounts.value.length > 0) {
					selectedAccount.value = accounts.value[0]
				} else {
					selectedAccount.value = null
				}
			}
		}

		function selectAccount(address: string, chainId: CHAIN_ID) {
			const account = accounts.value.find(a => isSameAddress(a.address, address) && a.chainId === chainId)
			if (!account) {
				throw new Error(`selectAccount: Account not found: ${address} ${chainId}`)
			}
			selectedAccount.value = account
		}

		function unselectAccount() {
			selectedAccount.value = null
		}

		function isAccountImported(accountAddress: string, chainId: CHAIN_ID) {
			return accounts.value.some(a => isSameAddress(a.address, accountAddress) && a.chainId === chainId)
		}

		/**
		 * Add a validation method to a specific account in accounts
		 */
		function addValidationMethod(account: ImportedAccount, vMethod: ValidationMethod) {
			const acc = accounts.value.find(a => isSameAccount(a, account))
			if (!acc) {
				throw new Error(`[addValidationMethod] Account not found: ${account.address} ${account.chainId}`)
			}

			// Throw error if the vMethod name is the same
			if (acc.vMethods.some(v => v.name === vMethod.name)) {
				throw new Error(`[addValidationMethod] Validation method already exists: ${vMethod.name}`)
			}

			acc.vMethods.push(vMethod.serialize())

			// update the account in accounts
			accounts.value = accounts.value.map(a => (isSameAccount(a, acc) ? acc : a))

			// if selected account is the one being updated, update the selected account
			if (selectedAccount.value && isSameAccount(selectedAccount.value, acc)) {
				selectedAccount.value = acc
			}
		}

		function removeValidationMethod(account: ImportedAccount, name: ValidationMethodName) {
			const acc = accounts.value.find(a => isSameAccount(a, account))
			if (!acc) {
				throw new Error(`removeValidationMethod: Account not found: ${account.address} ${account.chainId}`)
			}
			acc.vMethods = acc.vMethods.filter(v => v.name !== name)
			accounts.value = accounts.value.map(a => (isSameAccount(a, acc) ? acc : a))

			// if selected account is the one being updated, update the selected account
			if (selectedAccount.value && isSameAccount(selectedAccount.value, acc)) {
				selectedAccount.value = acc
			}

			// select the signer that's left if the signer is connected
			const signerType = deserializeValidationMethod(acc.vMethods[0]).signerType
			const { isSignerConnected, selectSigner } = useSigner()
			if (isSignerConnected(signerType)) {
				selectSigner(signerType)
			}
		}

		return {
			accounts,
			hasAccounts,
			importAccount,
			removeAccount,
			selectAccount,
			unselectAccount,
			isAccountImported,
			addValidationMethod,
			removeValidationMethod,
		}
	},
	{
		persist: {
			pick: ['accounts'],
			// Note: If the stored data contains bigint, a serializer must be used.
			// Otherwise, the state will be ignored and not saved to local storage.
			serializer: {
				deserialize: JSONParse,
				serialize: JSONStringify,
			},
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
