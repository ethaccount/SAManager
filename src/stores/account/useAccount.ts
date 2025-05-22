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
	isSameAddress,
	KernelV3Account,
	NexusAccount,
	Safe7579Account,
	Simple7702Account,
	WebAuthnValidator,
} from 'sendop'
import { toast } from 'vue-sonner'

type InitCodeData = {
	address: string
	initCode: string
	vOption: ValidationIdentifier
}

export const useAccountStore = defineStore(
	'useAccountStore',
	() => {
		const selectedAccount = ref<ImportedAccount | null>(null)

		const isChainIdMatching = computed(() => {
			const { selectedChainId } = useNetwork()
			return selectedChainId.value === selectedAccount.value?.chainId
		})

		const isAccountConnected = computed(() => {
			if (!selectedAccount.value) return false
			// check if the chainId of the selected account is the same as the selected chainId
			const { selectedChainId } = useNetwork()
			if (selectedAccount.value.chainId !== selectedChainId.value) return false

			return useSigner().isSignerEligibleForValidation(selectedAccount.value.vOptions)
		})

		watchImmediate(isAccountConnected, () => {
			const { switchEntryPoint } = useNetwork()
			if (!selectedAccount.value) return
			switchEntryPoint(SUPPORTED_ACCOUNTS[selectedAccount.value.accountId].entryPointVersion)
		})

		const isModular = computed(() => {
			if (!selectedAccount.value) return false
			return SUPPORTED_ACCOUNTS[selectedAccount.value.accountId].isModular
		})

		const isSmartEOA = computed(() => {
			if (!selectedAccount.value) return false
			return selectedAccount.value.category === 'Smart EOA'
		})

		const initCodeList = ref<InitCodeData[]>([])

		const hasInitCode = computed<boolean>(() => {
			const account = selectedAccount.value
			if (!account) return false
			return initCodeList.value.some(i => isSameAddress(i.address, account.address))
		})

		const initCodeData = computed<InitCodeData | null>(() => {
			const account = selectedAccount.value
			if (!account) return null
			return initCodeList.value.find(i => isSameAddress(i.address, account.address)) || null
		})

		function addInitCode(initCodeData: InitCodeData) {
			if (initCodeList.value.some(i => isSameAddress(i.address, initCodeData.address))) {
				throw new Error(`addInitCode: Init code already exists: ${initCodeData.address}`)
			}
			initCodeList.value.push(initCodeData)
		}

		function removeInitCode(address: string) {
			initCodeList.value = initCodeList.value.filter(i => !isSameAddress(i.address, address))
		}

		const accounts = ref<ImportedAccount[]>([])
		const hasAccounts = computed(() => accounts.value.length > 0)

		const erc7579Validator = computed<ERC7579Validator | null>(() => {
			const { selectedSigner } = useSigner()
			if (!isAccountConnected.value) return null
			if (!selectedSigner.value) return null
			if (!isModular.value) return null
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
				if (account.vOptions.length > 1) {
					throw new Error(`importAccount: Multiple vOptions are not supported with init code`)
				}
				addInitCode({
					address: account.address,
					initCode,
					vOption: account.vOptions[0],
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
			const account = accounts.value.find(a => a.address === address && a.chainId === chainId)
			if (!account) {
				throw new Error(`selectAccount: Account not found: ${address} ${chainId}`)
			}
			selectedAccount.value = account
		}

		function checkIfAccountIsImported(accountAddress: string, chainId: CHAIN_ID) {
			return accounts.value.some(a => isSameAddress(a.address, accountAddress) && a.chainId === chainId)
		}

		return {
			selectedAccount,
			initCodeList,
			initCodeData,
			hasInitCode,
			accounts,
			hasAccounts,
			opGetter,
			isAccountConnected,
			erc7579Validator,
			isModular,
			isSmartEOA,
			importAccount,
			removeAccount,
			selectAccount,
			checkIfAccountIsImported,
			isChainIdMatching,
		}
	},
	{
		persist: {
			pick: ['accounts', 'selectedAccount', 'initCodeList'],
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
