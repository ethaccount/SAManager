import { AccountId, ImportedAccount, SUPPORTED_ACCOUNTS } from '@/stores/account/account'
import { InitCodeData, useInitCode } from '@/stores/account/useInitCode'
import { useNetwork } from '@/stores/network/useNetwork'
import { signMessage } from '@/stores/passkey/passkey'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/validation/useSigner'
import { SUPPORTED_VALIDATION_OPTIONS } from '@/stores/validation/validation'
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

export const useAccountStore = defineStore(
	'useAccountStore',
	() => {
		const { initCodeList, hasInitCode } = useInitCode()

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
			if (account.category !== 'Smart Account') return false
			return hasInitCode(account.address)
		})

		const selectedAccountInitCodeData = computed<InitCodeData | null>(() => {
			const account = selectedAccount.value
			if (!account) return null
			return initCodeList.value.find(i => isSameAddress(i.address, account.address)) || null
		})

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

		return {
			selectedAccount,
			selectedAccountInitCodeData,
			opGetter,
			isCrossChain,
			isAccountConnected,
			erc7579Validator,
			isModular,
			isSmartEOA,
			isChainIdMatching,
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
