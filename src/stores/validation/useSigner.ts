import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { SUPPORTED_VALIDATION_OPTIONS, ValidationOption } from '@/stores/validation/validation'
import { isSameAddress } from 'sendop'

export type SUPPORTED_SIGNER_TYPE = 'EOAWallet' | 'Passkey'

export const useSignerStore = defineStore('useSignerStore', () => {
	const connectedSigners = computed<{
		[key in SUPPORTED_SIGNER_TYPE]: {
			identifier: string | null
			isConnected: boolean
		}
	}>(() => {
		const { isEOAWalletConnected, wallet } = useEOAWallet()
		const { isLogin, selectedCredentialId } = usePasskey()

		// console.log('connectedSigners: wallet.address', wallet.address)

		return {
			EOAWallet: {
				identifier: isEOAWalletConnected.value ? wallet.address : null,
				isConnected: isEOAWalletConnected.value,
			},
			Passkey: {
				identifier: isLogin.value ? selectedCredentialId.value : null,
				isConnected: isLogin.value,
			},
		}
	})

	const selectedSignerType = ref<SUPPORTED_SIGNER_TYPE | null>(null)
	const selectedSigner = computed<{
		type: SUPPORTED_SIGNER_TYPE
		identifier: string
	} | null>(() => {
		if (!selectedSignerType.value) return null
		const identifier = connectedSigners.value[selectedSignerType.value].identifier
		if (!identifier) {
			return null
		}

		return {
			type: selectedSignerType.value,
			identifier,
		}
	})

	function selectSigner(signerType: SUPPORTED_SIGNER_TYPE) {
		// if the signer type is already selected, do nothing
		if (signerType === selectedSignerType.value) return
		// check if the signer is connected
		if (connectedSigners.value[signerType].isConnected) {
			if (!connectedSigners.value[signerType].identifier) {
				throw new Error(`useSignerStore: Signer of type ${signerType} has no identifier but is connected`)
			}
			selectedSignerType.value = signerType
		} else {
			// if the signer type is not connected, throw an error
			throw new Error(`useSignerStore: Signer of type ${signerType} is not connected`)
		}
	}

	function isSignerEligibleForValidation(vOptions: ValidationOption[]): boolean {
		const { selectedSigner } = useSigner()
		if (!selectedSigner.value) return false

		// console.log('checkValidationAvailability: selectedSigner', selectedSigner.value)

		for (const vOption of vOptions) {
			const vOptionSignerType = SUPPORTED_VALIDATION_OPTIONS[vOption.type].signerType

			if (vOptionSignerType === selectedSigner.value.type) {
				if (vOptionSignerType === 'EOAWallet') {
					if (isSameAddress(selectedSigner.value.identifier, vOption.identifier)) {
						return true
					}
				}

				if (vOptionSignerType === 'Passkey') {
					if (selectedSigner.value.identifier === vOption.identifier) {
						return true
					}
				}
			}
		}

		return false
	}

	return {
		connectedSigners,
		selectedSigner,
		selectSigner,
		isSignerEligibleForValidation,
	}
})

export function useSigner() {
	const store = useSignerStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
