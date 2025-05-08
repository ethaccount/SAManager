import { AccountId, ImportedAccount } from '@/stores/account/account'
import { CHAIN_ID } from '@/stores/network/network'
import { signMessage } from '@/stores/passkey/passkey'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useValidation } from '@/stores/validation/useValidation'
import { checkValidationAvailability, SUPPORTED_VALIDATION_OPTIONS } from '@/stores/validation/validation'
import { defineStore, storeToRefs } from 'pinia'
import {
	ERC7579Validator,
	isSameAddress,
	KernelV3Account,
	NexusAccount,
	OwnableValidator,
	Safe7579Account,
	WebAuthnValidator,
} from 'sendop'
import { toast } from 'vue-sonner'
import { useNetwork } from '../network/useNetwork'

export const useAccountStore = defineStore(
	'useAccountStore',
	() => {
		const addressToInitCode = ref<Map<string, string>>(new Map())

		const selectedAccount = ref<ImportedAccount | null>(null)
		const selectedAccountInitCode = computed<string | null>(() => {
			if (!selectedAccount.value) return null
			return addressToInitCode.value.get(selectedAccount.value.address) || null
		})

		const accounts = ref<ImportedAccount[]>([])
		const hasAccounts = computed(() => accounts.value.length > 0)

		const isAccountConnected = computed(() => {
			if (!selectedAccount.value) return false
			return checkValidationAvailability(selectedAccount.value.vOptions)
		})

		const erc7579Validator = computed<ERC7579Validator | null>(() => {
			const { selectedSigner } = useValidation()
			if (!isAccountConnected.value) return null
			if (!selectedSigner.value) return null

			switch (selectedSigner.value.type) {
				case 'EOA-Owned':
					const { signer } = useEOAWallet()
					if (!signer.value) {
						return null
					}
					return new OwnableValidator({
						signers: [signer.value],
					})
				case 'Passkey':
					const { credential } = usePasskey()
					if (!credential.value) {
						return null
					}
					return new WebAuthnValidator({
						address: SUPPORTED_VALIDATION_OPTIONS['Passkey'].validatorAddress,
						signMessage: signMessage,
					})
				default:
					return null
			}
		})

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

		function importAccount(account: ImportedAccount, initCode?: string) {
			if (!account.address || !account.chainId || !account.accountId || !account.category) {
				throw new Error(`importAccount: Invalid values: ${JSON.stringify(account)}`)
			}

			// should have at least one vOption
			if (!account.vOptions || account.vOptions.length === 0) {
				throw new Error(`importAccount: No validation options`)
			}

			if (accounts.value.find(a => isSameAddress(a.address, account.address) && a.chainId === account.chainId)) {
				toast.info('Account already imported')
				return
			}

			accounts.value.push({
				...account,
			})

			if (initCode) {
				addressToInitCode.value.set(account.address, initCode)
			}

			toast.success('Account imported successfully')

			if (accounts.value.length === 1) {
				selectedAccount.value = accounts.value[0]
			}
		}

		function removeAccount(account: ImportedAccount) {
			accounts.value = accounts.value.filter(a => a.address !== account.address)

			// remove the init code for the account
			addressToInitCode.value.delete(account.address)

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
			const account = accounts.value.find(a => a.address === address && a.chainId === chainId)
			if (!account) {
				throw new Error(`selectAccount: Account not found: ${address} ${chainId}`)
			}
			selectedAccount.value = account
		}

		return {
			selectedAccount,
			selectedAccountInitCode,
			accounts,
			hasAccounts,
			opGetter,
			isAccountConnected,
			erc7579Validator,
			importAccount,
			removeAccount,
			selectAccount,
		}
	},
	{
		persist: {
			pick: ['accounts', 'selectedAccount', 'addressToInitCode'],
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
