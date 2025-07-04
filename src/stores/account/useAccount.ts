import { ImportedAccount, SUPPORTED_ACCOUNTS } from '@/stores/account/account'
import { InitCodeData, useInitCode } from '@/stores/account/useInitCode'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useSigner } from '@/stores/validation/useSigner'
import { isSameAddress } from 'sendop'

export const useAccountStore = defineStore(
	'useAccountStore',
	() => {
		const { initCodeList, hasInitCode } = useInitCode()

		const selectedAccount = ref<ImportedAccount | null>(null)

		const isChainIdMatching = computed(() => {
			const { selectedChainId } = useBlockchain()
			return selectedChainId.value === selectedAccount.value?.chainId
		})

		const isAccountConnected = computed(() => {
			if (!selectedAccount.value) return false
			// check if the chainId of the selected account is the same as the selected chainId
			const { selectedChainId } = useBlockchain()
			if (selectedAccount.value.chainId !== selectedChainId.value) return false

			return useSigner().isSignerEligibleForValidation(selectedAccount.value.vMethods)
		})

		const isModular = computed(() => {
			if (!selectedAccount.value) return false
			return SUPPORTED_ACCOUNTS[selectedAccount.value.accountId].isModular
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
			isCrossChain,
			isAccountConnected,
			isModular,
			isSmartEOA,
			isChainIdMatching,
			checkIsCrossChain,
		}
	},
	{
		persist: {
			pick: ['selectedAccount'],
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
