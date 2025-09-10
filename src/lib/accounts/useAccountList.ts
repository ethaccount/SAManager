import { useConfirmModal } from '@/lib/modals/useConfirmModal'
import { ImportedAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useAccounts } from '@/stores/account/useAccounts'
import { useInitCode } from '@/stores/account/useInitCode'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { isSameAddress } from 'sendop'

export type AccountWithMultichain = ImportedAccount & { isMultichain: boolean }

export function useAccountList() {
	const { accounts } = useAccounts()
	const { hasInitCode } = useInitCode()
	const { selectedAccount } = useAccount()

	const accountList = computed<AccountWithMultichain[]>(() =>
		accounts.value.reduce((acc, cur) => {
			const account = {
				...cur,
				isMultichain: cur.category === 'Smart Account' && hasInitCode(cur.address),
			}

			// Regular accounts: always add (no deduplication needed)
			// Multichain accounts: only add if not already present (deduplicate)
			if (!account.isMultichain) {
				acc.push(account)
			} else if (!acc.some(a => isSameAddress(a.address, account.address))) {
				acc.push(account)
			}

			return acc
		}, [] as AccountWithMultichain[]),
	)

	function isAccountSelected(account: AccountWithMultichain) {
		return (
			selectedAccount.value &&
			isSameAddress(account.address, selectedAccount.value.address) &&
			(account.chainId === selectedAccount.value.chainId || account.isMultichain)
		)
	}

	function onClickSelectAccount(account: AccountWithMultichain) {
		const { selectedChainId } = useBlockchain()
		const { isAccountImported, selectAccount, importAccount } = useAccounts()

		if (account.isMultichain) {
			// Auto import account if it's multichain, and there's no account imported for this chain
			const isImported = isAccountImported(account.address, selectedChainId.value)
			if (!isImported) {
				// import the account with current chainId if it's multichain and not imported
				const { isMultichain, ...acc } = account // eslint-disable-line @typescript-eslint/no-unused-vars

				importAccount({
					...acc,
					chainId: selectedChainId.value,
				})
			}
			selectAccount(account.address, selectedChainId.value)
		} else {
			selectAccount(account.address, account.chainId)
		}
	}

	function onClickDeleteAccount(account: ImportedAccount) {
		const { openModal } = useConfirmModal()
		const { removeAccount } = useAccounts()

		openModal({
			title: 'Delete Account',
			message: 'Are you sure you want to delete this account? This action cannot be undone.',
			confirmText: 'Delete',
			cancelText: 'Cancel',
			onConfirm: () => {
				removeAccount(account)
			},
			clickToClose: true,
		})
	}

	function onClickUnselectAccount() {
		const { unselectAccount } = useAccounts()
		unselectAccount()
	}

	return {
		accountList,
		isAccountSelected,
		onClickSelectAccount,
		onClickDeleteAccount,
		onClickUnselectAccount,
	}
}
