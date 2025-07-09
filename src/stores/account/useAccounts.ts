import { ValidationMethod, ValidationMethodName } from '@/lib/validations'
import { ImportedAccount, isSameAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useInitCode } from '@/stores/account/useInitCode'
import { CHAIN_ID } from '@/stores/blockchain/blockchain'
import { JSONParse, JSONStringify } from 'json-with-bigint'
import { isSameAddress } from 'sendop'

const ACCOUNTS_STORAGE_KEY = 'samanager-accounts'

export const useAccountsStore = defineStore('useAccountsStore', () => {
	const { addInitCode, removeInitCode } = useInitCode()
	const { selectedAccount } = useAccount()

	const accounts = ref<ImportedAccount[]>(loadAccountsFromStorage())

	// Watch for changes and sync to localStorage
	watchDeep(accounts, newAccounts => {
		saveAccountsToStorage(newAccounts)
	})

	// migrate vOptions to vMethods
	watchImmediate(accounts, accounts => {
		const vOptionsToVMethods: Record<string, ValidationMethodName> = {
			'EOA-Ownable': 'ECDSAValidator',
			Passkey: 'WebAuthnValidator',
		}
		accounts.forEach(account => {
			if (account.vOptions) {
				for (const vOption of account.vOptions) {
					// add vMethods field if it doesn't exist
					if (!account.vMethods) {
						account.vMethods = []
					}
					const vMethodName = vOptionsToVMethods[vOption.type]
					if (vMethodName === 'WebAuthnValidator') {
						account.vMethods.push({
							name: vMethodName,
							credentialId: vOption.identifier,
						})
					} else {
						account.vMethods.push({
							name: vMethodName,
							address: vOption.identifier,
						})
					}
				}
				delete account.vOptions
				console.log('migrated account', account.address)
			}
		})
	})

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

		console.log('Account imported successfully', account)

		if (accounts.value.length === 1) {
			selectedAccount.value = accounts.value[0]
		}
	}

	function removeAccount(account: ImportedAccount) {
		accounts.value = accounts.value.filter(a => a.address !== account.address)

		// remove the init code for the account
		removeInitCode(account.address)

		// if the selected account is the one being removed, select the first account in the list
		if (selectedAccount.value?.address === account.address) {
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

	function addValidationMethod(account: ImportedAccount, vMethod: ValidationMethod) {
		const acc = accounts.value.find(a => isSameAccount(a, account))
		if (!acc) {
			throw new Error(`addValidationMethod: Account not found: ${account.address} ${account.chainId}`)
		}
		acc.vMethods.push(vMethod.serialize())
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
})

export function useAccounts() {
	const store = useAccountsStore()
	return {
		...store,
		...storeToRefs(store),
	}
}

function loadAccountsFromStorage(): ImportedAccount[] {
	try {
		const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
		return stored ? JSONParse(stored) : []
	} catch (error) {
		console.error('Failed to load accounts from localStorage:', error)
		return []
	}
}

function saveAccountsToStorage(accounts: ImportedAccount[]) {
	try {
		localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSONStringify(accounts))
	} catch (error) {
		console.error('Failed to save accounts to localStorage:', error)
	}
}
