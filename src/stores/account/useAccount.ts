import { AccountRegistry } from '@/lib/accounts'
import { ValidationMethod } from '@/lib/validations'
import { deserializeValidationMethod } from '@/lib/validations/helpers'
import { ImportedAccount } from '@/stores/account/account'
import { InitCodeData, useInitCode } from '@/stores/account/useInitCode'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useSigner } from '@/stores/useSigner'
import { JSONParse, JSONStringify } from 'json-with-bigint'
import { isSameAddress } from 'sendop'

export const useAccountStore = defineStore(
	'useAccountStore',
	() => {
		const { initCodeList, hasInitCode } = useInitCode()
		const { selectedSigner } = useSigner()
		const { selectedChainId } = useBlockchain()

		const selectedAccount = ref<ImportedAccount | null>(null)

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

			return accountVMethods.value.some(vMethod => {
				if (!selectedSigner.value) return false
				return vMethod.isValidSigner(selectedSigner.value)
			})
		})

		const isModular = computed(() => {
			if (!selectedAccount.value) return false
			return AccountRegistry.getIsModular(selectedAccount.value.accountId)
		})

		const isSmartEOA = computed(() => {
			if (!selectedAccount.value) return false
			return selectedAccount.value.category === 'Smart EOA'
		})

		const isMultichain = computed<boolean>(() => {
			const account = selectedAccount.value
			if (!account) return false
			return checkIsMultichain(account)
		})

		function checkIsMultichain(account: ImportedAccount) {
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
			isMultichain,
			isAccountAccessible,
			isModular,
			isSmartEOA,
			isChainIdMatching,
			checkIsMultichain,
		}
	},
	{
		persist: {
			pick: ['selectedAccount'],
			// Note: If the stored data contains bigint, a serializer must be used.
			// Otherwise, the state will be ignored and not saved to local storage.
			serializer: {
				deserialize: JSONParse,
				serialize: JSONStringify,
			},
		},
	},
)

export function useAccount() {
	const store = useAccountStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
