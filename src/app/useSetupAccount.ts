import { SUPPORTED_ACCOUNTS } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useAccounts } from '@/stores/account/useAccounts'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'

export function useSetupAccount() {
	const { selectAccount } = useAccounts()
	const { selectedAccount, isAccountConnected, isCrossChain } = useAccount()
	const { selectedChainId, switchEntryPoint } = useBlockchain()

	watchImmediate(isAccountConnected, () => {
		if (!selectedAccount.value) return
		switchEntryPoint(SUPPORTED_ACCOUNTS[selectedAccount.value.accountId].entryPointVersion)
	})

	watchImmediate(selectedChainId, () => {
		if (!selectedAccount.value) return

		// TODO: isCrossChain without .value cannot be detected by eslint
		if (isCrossChain.value && selectedAccount.value.chainId !== selectedChainId.value) {
			selectAccount(selectedAccount.value.address, selectedChainId.value)
		}
	})
}
