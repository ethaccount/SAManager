import { isModularAccount } from '@/lib/accounts'
import { ValidationMethod } from '@/lib/validations'
import { deserializeValidationMethod } from '@/lib/validations/helpers'
import { ImportedAccount } from '@/stores/account/account'
import { InitCodeData, useInitCode } from '@/stores/account/useInitCode'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useSigner } from '@/stores/useSigner'
import { JSONParse, JSONStringify } from 'json-with-bigint'
import { isSameAddress } from 'sendop'

const SELECTED_ACCOUNT_STORAGE_KEY = 'samanager-selected-account'

export const useAccountStore = defineStore('useAccountStore', () => {
	const { initCodeList, hasInitCode } = useInitCode()
	const { canSign } = useSigner()
	const { selectedChainId } = useBlockchain()

	const selectedAccount = ref<ImportedAccount | null>(loadSelectedAccountFromStorage())

	// Watch for changes and sync to localStorage
	watchDeep(selectedAccount, newAccount => {
		saveSelectedAccountToStorage(newAccount)
	})

	const isChainIdMatching = computed(() => {
		return selectedChainId.value === selectedAccount.value?.chainId
	})

	const accountVMethods = computed<ValidationMethod[]>(() => {
		if (!selectedAccount.value) return []
		if (!selectedAccount.value.vMethods) return []
		return selectedAccount.value.vMethods.map(vMethod => deserializeValidationMethod(vMethod))
	})

	const isAccountAccessible = computed(() => {
		if (!selectedAccount.value) return false
		if (selectedAccount.value.chainId !== selectedChainId.value) return false
		return accountVMethods.value.some(canSign)
	})

	const isModular = computed(() => {
		if (!selectedAccount.value) return false
		return isModularAccount(selectedAccount.value.accountId)
	})

	const isSmartEOA = computed(() => {
		if (!selectedAccount.value) return false
		return selectedAccount.value.category === 'Smart EOA'
	})

	const isCrossChain = computed<boolean>(() => {
		const account = selectedAccount.value
		if (!account) return false
		return checkIsCrossChain(account)
	})

	function checkIsCrossChain(account: ImportedAccount) {
		if (account.category !== 'Smart Account') return false
		return hasInitCode(account.address)
	}

	const selectedAccountInitCodeData = computed<InitCodeData | null>(() => {
		const account = selectedAccount.value
		if (!account) return null
		return initCodeList.value.find(i => isSameAddress(i.address, account.address)) || null
	})

	return {
		selectedAccount,
		selectedAccountInitCodeData,
		accountVMethods,
		isCrossChain,
		isAccountAccessible,
		isModular,
		isSmartEOA,
		isChainIdMatching,
		checkIsCrossChain,
	}
})

export function useAccount() {
	const store = useAccountStore()
	return {
		...store,
		...storeToRefs(store),
	}
}

function loadSelectedAccountFromStorage(): ImportedAccount | null {
	try {
		const stored = localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY)
		return stored ? JSONParse(stored) : null
	} catch (error) {
		console.error('Failed to load selected account from localStorage:', error)
		return null
	}
}

function saveSelectedAccountToStorage(account: ImportedAccount | null) {
	try {
		if (account) {
			localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, JSONStringify(account))
		} else {
			localStorage.removeItem(SELECTED_ACCOUNT_STORAGE_KEY)
		}
	} catch (error) {
		console.error('Failed to save selected account to localStorage:', error)
	}
}
