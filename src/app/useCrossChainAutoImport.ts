import { useAccount } from '@/stores/account/useAccount'
import { useAccounts } from '@/stores/account/useAccounts'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'

export function useCrossChainAutoImport() {
	const { selectAccount, isAccountImported, importAccount } = useAccounts()
	const { selectedAccount, isCrossChain, isChainIdMatching } = useAccount()
	const { selectedChainId } = useBlockchain()

	// Timing: App loaded, Chain changed
	watchImmediate(selectedChainId, () => {
		if (!selectedAccount.value) return

		// feat: auto import and select the account if it's cross chain and chainId mismatch
		// TODO: isCrossChain without .value cannot be detected by eslint, refer to https://github.com/vuejs/eslint-plugin-vue/issues/2114
		if (isCrossChain.value && !isChainIdMatching.value) {
			const isImported = isAccountImported(selectedAccount.value.address, selectedChainId.value)

			if (!isImported) {
				importAccount({
					...selectedAccount.value,
					chainId: selectedChainId.value,
					// When auto-importing cross-chain accounts, undeployed accounts on the new chain
					// should only have the first validation method, as additional validation methods
					// need to be installed after deployment
					vMethods: [selectedAccount.value.vMethods[0]],
				})
			}
			selectAccount(selectedAccount.value.address, selectedChainId.value)
		}
	})
}
