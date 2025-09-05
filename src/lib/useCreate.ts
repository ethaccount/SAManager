import { useExecutionModal } from '@/components/execution'
import {
	ACCOUNT_SUPPORTED_INITIAL_VALIDATION,
	AccountId,
	AccountRegistry,
	Deployment,
	getDeployment,
} from '@/lib/accounts'
import { useGetCode } from '@/lib/useGetCode'
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
	const { client, selectedChainId } = useBlockchain()
	const { signer } = useEOAWallet()
	const { isLogin, isFullCredential, selectedCredential } = usePasskey()
	const { importAccount, selectAccount, isAccountImported } = useAccounts()
	const { selectedSigner } = useSigner()

	const supportedAccounts = AccountRegistry.getSupportedAccountsForCreation()

	const selectedAccountType = ref<AccountId | undefined>(undefined) // use undefined instead of null for v-model
	const selectedValidationType = ref<ValidationType | undefined>(undefined) // use undefined instead of null for v-model

	const supportedValidations = computed<
		{
			type: ValidationType
			name: ValidationMethodName
		}[]
	>(() => {
		if (!selectedAccountType.value) return []
		return ACCOUNT_SUPPORTED_INITIAL_VALIDATION[selectedAccountType.value] || []
	})

	const isComputingAddress = ref(false)
	const showMoreOptions = ref(false)

	// Reset validation type when account type is changed
	watch(selectedAccountType, () => {
		// if the supported validations only has one type, select it
		if (supportedValidations.value && supportedValidations.value.length === 1) {
			selectedValidationType.value = supportedValidations.value[0].type
		} else {
			selectedValidationType.value = undefined
		}
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

	// Auto select the signer when the selectedValidationMethod is updated
	watchImmediate(selectedValidationMethod, () => {
		if (selectedValidationMethod.value) {
			const { selectSigner } = useSigner()
			selectSigner(selectedValidationMethod.value.signerType)
		}
	})

	const saltInput = ref<number | undefined>(undefined)
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

	const deployment = ref<Deployment | null>(null)
	const isDeployed = ref(false)

	const computedAddress = computed(() => {
		return deployment.value?.accountAddress
	})

	const initCode = computed(() => {
		if (!deployment.value) return null
		return concat([deployment.value.factory, deployment.value.factoryData])
	})

	const isImported = computed(() => {
		return deployment.value && isAccountImported(deployment.value.accountAddress, selectedChainId.value)
	})

	const errMsg = ref<string | null>(null)

	// when these states are changed, we need to re-compute the deployment
	watchImmediate(
		[isValidationAvailable, selectedValidationType, isLogin, selectedAccountType, computedSalt],
		async () => {
			deployment.value = null
			isDeployed.value = false
			errMsg.value = null

			if (
				isValidationAvailable.value &&
				selectedValidationMethod.value &&
				selectedAccountType.value &&
				computedSalt.value
			) {
				isComputingAddress.value = true
				try {
					deployment.value = await getDeployment(
						client.value,
						selectedAccountType.value,
						selectedValidationMethod.value,
						computedSalt.value,
					)
					console.log('deployment', deployment.value)
					const { getCode, isDeployed: isAccountDeployed } = useGetCode()
					await getCode(deployment.value.accountAddress)
					isDeployed.value = isAccountDeployed.value
				} catch (error) {
					throw error
				} finally {
					isComputingAddress.value = false
				}
			} else {
				if (selectedValidationType.value === 'PASSKEY' && isLogin.value && !isFullCredential.value) {
					errMsg.value = `This passkey's public key is not stored in the browser,
                        so it can only be used for signing but not for creating a new account.
                        To use a passkey with a public key, please create a new one.`
				}
			}
		},
	)

	const disabledDeployButton = computed(() => {
		return !computedAddress.value || !initCode.value || !selectedValidationMethod.value || isDeployed.value
	})

	const disabledImportButton = computed(() => {
		return !computedAddress.value || !initCode.value || !selectedValidationMethod.value
	})

	function onClickDeploy() {
		if (!selectedAccountType.value) {
			throw new Error('onClickDeploy: No account type')
		}

		if (!computedAddress.value) {
			throw new Error('onClickDeploy: No computed address')
		}

		if (!initCode.value) {
			throw new Error('onClickDeploy: No init code')
		}

		if (!selectedValidationMethod.value) {
			throw new Error('onClickDeploy: No validation')
		}

		console.log('initCode', initCode.value)

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

		selectAccount(computedAddress.value, selectedChainId.value)

		useExecutionModal().openModal({
			// Update the deployed status when the transaction status changes
			// When users has deployed and closed the modal, they can't click the deploy button again
			onSuccess: async () => {
				if (!computedAddress.value) {
					throw new Error('[onClickDeploy] computedAddress is falsy')
				}
				const { getCode, isDeployed: isAccountDeployed } = useGetCode()
				await getCode(computedAddress.value)
				isDeployed.value = isAccountDeployed.value
			},
		})
	}

	function handleImport() {
		if (!selectedAccountType.value) {
			throw new Error('handleImport: No account type')
		}

		if (!computedAddress.value) {
			throw new Error('handleImport: No computed address')
		}

		if (!initCode.value) {
			throw new Error('handleImport: No init code')
		}

		if (!selectedValidationMethod.value) {
			throw new Error('handleImport: No validation')
		}

		if (!isImported.value) {
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
		isImported,
		disabledImportButton,
		disabledDeployButton,
		errMsg,
		initCode,
		onClickDeploy,
		handleImport,
	}
}
