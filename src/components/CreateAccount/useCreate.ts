import { ACCOUNT_SUPPORTED_INITIAL_VALIDATION, AccountId, AccountRegistry, Deployment } from '@/lib/accounts'
import {
	ECDSAValidatorVMethod,
	OwnableValidatorVMethod,
	ValidationMethod,
	ValidationMethodName,
	ValidationType,
	WebAuthnValidatorVMethod,
} from '@/lib/validations'
import { useAccounts } from '@/stores/account/useAccounts'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/useSigner'
import { concat, getBigInt, hexlify } from 'ethers'
import { toBytes32 } from 'sendop'

export function useCreate() {
	const { selectedChainId } = useBlockchain()
	const { signer } = useEOAWallet()
	const { selectedCredential } = usePasskey()
	const { importAccount, selectAccount, isAccountImported } = useAccounts()
	const { selectedSigner } = useSigner()

	const supportedAccounts = AccountRegistry.getSupportedAccountsForCreation()

	const selectedAccountType = ref<AccountId | undefined>(undefined) // use undefined instead of null for v-model
	const selectedValidationType = ref<ValidationType | undefined>(undefined) // use undefined instead of null for v-model
	const isComputingAddress = ref(false)
	const showMoreOptions = ref(false)
	const saltInput = ref<number | undefined>(undefined)
	const deployment = ref<Deployment | null>(null)
	const isDeployed = ref(false)
	const errMsg = ref<string | null>(null)

	const supportedValidations = computed<
		{
			type: ValidationType
			name: ValidationMethodName
		}[]
	>(() => {
		if (!selectedAccountType.value) return []
		return ACCOUNT_SUPPORTED_INITIAL_VALIDATION[selectedAccountType.value] || []
	})

	const selectedValidationMethod = computed<ValidationMethod | null>(() => {
		// Return null instead of throwing error in this computed property
		if (!selectedAccountType.value) return null
		if (!selectedValidationType.value) return null

		switch (selectedValidationType.value) {
			case 'EOA-Owned': {
				if (!signer.value) return null
				const signerAddress = signer.value.address

				// get account supported validation method name
				const validationMethodName = ACCOUNT_SUPPORTED_INITIAL_VALIDATION[selectedAccountType.value]?.find(
					v => v.type === selectedValidationType.value,
				)?.name
				if (!validationMethodName) return null

				switch (validationMethodName) {
					case 'ECDSAValidator':
						return new ECDSAValidatorVMethod(signerAddress)
					case 'OwnableValidator':
						return new OwnableValidatorVMethod({
							addresses: [signerAddress],
							threshold: 1,
						})
					default:
						return null
				}
			}
			case 'PASSKEY': {
				if (!selectedCredential.value) return null
				const credential = selectedCredential.value
				return new WebAuthnValidatorVMethod(
					getAuthenticatorIdHash(credential.credentialId),
					getBigInt(hexlify(credential.pubKeyX)),
					getBigInt(hexlify(credential.pubKeyY)),
					credential.username,
				)
			}
			default:
				return null
		}
	})

	const computedSalt = computed(() => {
		if (!saltInput.value) return APP_SALT
		return toBytes32(BigInt(saltInput.value))
	})

	// Check if the signer is connected and corresponding to the selected validation type
	const isValidationAvailable = computed(() => {
		if (!selectedValidationMethod.value) return false
		if (!selectedSigner.value) return false
		return selectedValidationMethod.value.isValidSigner(selectedSigner.value)
	})

	const computedAddress = computed(() => {
		return deployment.value?.accountAddress
	})

	const initCode = computed(() => {
		if (!deployment.value) return null
		return concat([deployment.value.factory, deployment.value.factoryData])
	})

	function handleCreate() {
		if (!selectedAccountType.value) {
			throw new Error('handleCreate: No account type')
		}

		if (!computedAddress.value) {
			throw new Error('handleCreate: No computed address')
		}

		if (!initCode.value) {
			throw new Error('handleCreate: No init code')
		}

		if (!selectedValidationMethod.value) {
			throw new Error('handleCreate: No validation')
		}

		if (!isAccountImported(computedAddress.value, selectedChainId.value)) {
			importAccount(
				{
					accountId: selectedAccountType.value,
					category: 'Smart Account',
					address: computedAddress.value,
					chainId: selectedChainId.value,
					vMethods: [selectedValidationMethod.value.serialize()],
				},
				initCode.value,
			)
		}

		selectAccount(computedAddress.value, selectedChainId.value)
	}

	return {
		computedSalt,
		deployment,
		selectedAccountType,
		selectedValidationType,
		supportedAccounts,
		supportedValidations,
		isValidationAvailable,
		selectedValidationMethod,
		showMoreOptions,
		saltInput,
		computedAddress,
		isComputingAddress,
		isDeployed,
		errMsg,
		initCode,
		handleCreate,
	}
}
