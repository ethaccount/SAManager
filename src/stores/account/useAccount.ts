import { LOCAL_STORAGE_KEY_PREFIX } from '@/config'
import { AccountId, ImportedAccount, isSameAccount, SUPPORTED_ACCOUNTS } from '@/stores/account/account'
import { CHAIN_ID } from '@/stores/network/network'
import { useNetwork } from '@/stores/network/useNetwork'
import { signMessage } from '@/stores/passkey/passkey'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/validation/useSigner'
import { SUPPORTED_VALIDATION_OPTIONS, ValidationIdentifier } from '@/stores/validation/validation'
import {
	EOAValidator,
	ERC7579Validator,
	KernelV3Account,
	NexusAccount,
	Safe7579Account,
	Simple7702Account,
	WebAuthnValidator,
} from 'sendop'
import { toast } from 'vue-sonner'

export const useAccountStore = defineStore(
	'useAccountStore',
	() => {
		// ===================== addressToInitCode =====================
		const addressToInitCode = ref<
			Map<
				string,
				{
					vOptions: ValidationIdentifier[]
					initCode: string
				}
			>
		>(new Map())

		const savedData = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}addressToInitCode`)
		if (savedData) {
			try {
				const parsed = JSON.parse(savedData)
				addressToInitCode.value = new Map(Object.entries(parsed))
			} catch (e) {
				throw new Error(`Failed to parse addressToInitCode from localStorage: ${e}`)
			}
		}

		watchDeep(addressToInitCode, () => {
			const storageObj = Object.fromEntries(addressToInitCode.value)
			localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}addressToInitCode`, JSON.stringify(storageObj))
		})
		// ===================== addressToInitCode =====================

		const selectedAccount = ref<ImportedAccount | null>(null)
		const selectedAccountInitCode = computed<string | null>(() => {
			if (!selectedAccount.value) return null
			return addressToInitCode.value.get(selectedAccount.value.address)?.initCode || null
		})
		const isSelectedAccountModular = computed(() => {
			if (!selectedAccount.value) return false
			return SUPPORTED_ACCOUNTS[selectedAccount.value.accountId].isModular
		})

		const accounts = ref<ImportedAccount[]>([])
		const hasAccounts = computed(() => accounts.value.length > 0)

		const isAccountConnected = computed(() => {
			if (!selectedAccount.value) return false
			// check if the chainId of the selected account is the same as the selected chainId
			const { selectedChainId } = useNetwork()
			if (selectedAccount.value.chainId !== selectedChainId.value) return false

			return useSigner().isSignerEligibleForValidation(selectedAccount.value.vOptions)
		})

		watch(isAccountConnected, () => {
			const { switchEntryPoint } = useNetwork()
			if (!selectedAccount.value) return
			switchEntryPoint(SUPPORTED_ACCOUNTS[selectedAccount.value.accountId].entryPointVersion)
		})

		const erc7579Validator = computed<ERC7579Validator | null>(() => {
			const { selectedSigner } = useSigner()
			if (!isAccountConnected.value) return null
			if (!selectedSigner.value) return null
			if (!isSelectedAccountModular.value) return null
			if (!selectedAccount.value) return null

			switch (selectedSigner.value.type) {
				case 'EOAWallet':
					const { signer } = useEOAWallet()
					if (!signer.value) {
						return null
					}
					return new EOAValidator({
						address: SUPPORTED_VALIDATION_OPTIONS['EOA-Owned'].validatorAddress,
						signer: signer.value,
					})
				case 'Passkey':
					const { isLogin } = usePasskey()
					if (!isLogin.value) {
						return null
					}
					return new WebAuthnValidator({
						address: SUPPORTED_VALIDATION_OPTIONS['Passkey'].validatorAddress,
						signMessage: signMessage,
					})
			}
		})

		const opGetter = computed(() => {
			if (!selectedAccount.value || !isAccountConnected.value) return null

			const { client, bundler } = useNetwork()

			switch (selectedAccount.value.accountId) {
				case AccountId['kernel.advanced.v0.3.1']:
					if (!erc7579Validator.value) {
						return null
					}
					return new KernelV3Account({
						address: selectedAccount.value.address,
						client: client.value,
						bundler: bundler.value,
						validator: erc7579Validator.value,
					})
				case AccountId['biconomy.nexus.1.0.2']:
					if (!erc7579Validator.value) {
						return null
					}
					return new NexusAccount({
						address: selectedAccount.value.address,
						client: client.value,
						bundler: bundler.value,
						validator: erc7579Validator.value,
					})
				case AccountId['rhinestone.safe7579.v1.0.0']:
					if (!erc7579Validator.value) {
						return null
					}
					return new Safe7579Account({
						address: selectedAccount.value.address,
						client: client.value,
						bundler: bundler.value,
						validator: erc7579Validator.value,
					})
				case AccountId['infinitism.Simple7702Account.0.8.0']:
					const { signer } = useEOAWallet()
					if (!signer.value) {
						return null
					}
					return new Simple7702Account({
						address: selectedAccount.value.address,
						client: client.value,
						bundler: bundler.value,
						signer: signer.value,
					})
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

			if (accounts.value.some(a => isSameAccount(a, account))) {
				toast.info('Account already imported')
				return
			}

			accounts.value.push({
				...account,
			})

			if (initCode) {
				addressToInitCode.value.set(account.address, {
					vOptions: account.vOptions,
					initCode,
				})
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
