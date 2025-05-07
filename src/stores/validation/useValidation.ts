import { signMessage } from '@/lib/passkey'
import { defineStore, storeToRefs } from 'pinia'
import { EOAValidatorModule, ERC7579Validator, WebAuthnValidatorModule } from 'sendop'
import { useAccounts } from '../useAccounts'
import { useEOAWallet } from '../useEOAWallet'
import { usePasskey } from '../usePasskey'
import { useSigner } from './useSigner'
import { checkValidationAvailability, SUPPORTED_VALIDATION_OPTIONS } from './validation'

export const useValidationStore = defineStore('useValidationStore', () => {
	const { selectedAccount } = useAccounts()

	const isAccountConnected = computed(() => {
		if (!selectedAccount.value) return false
		return checkValidationAvailability(selectedAccount.value.vOptions)
	})

	const erc7579Validator = computed<ERC7579Validator | null>(() => {
		const { isAccountConnected } = useValidation()
		const { selectedSigner } = useSigner()
		if (!isAccountConnected.value) return null
		if (!selectedSigner.value) return null

		switch (selectedSigner.value.type) {
			case 'EOA-Owned':
				const { signer } = useEOAWallet()
				if (!signer.value) {
					return null
				}
				return new EOAValidatorModule({
					address: SUPPORTED_VALIDATION_OPTIONS['EOA-Owned'].validatorAddress,
					signer: signer.value,
				})
			case 'Passkey':
				const { credential } = usePasskey()
				if (!credential.value) {
					return null
				}
				return new WebAuthnValidatorModule({
					address: SUPPORTED_VALIDATION_OPTIONS['Passkey'].validatorAddress,
					signMessage: signMessage,
				})
			default:
				return null
		}
	})

	return {
		isAccountConnected,
		erc7579Validator,
	}
})

export function useValidation() {
	const store = useValidationStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
