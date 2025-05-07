import { defineStore, storeToRefs } from 'pinia'
import { ADDRESS, EOAValidatorModule, ERC7579Validator, isSameAddress, WebAuthnValidatorModule } from 'sendop'
import { useAccounts } from '../useAccounts'
import { useSigner } from './useSigner'
import { useEOAWallet } from '../useEOAWallet'
import { usePasskey } from '../usePasskey'
import { signMessage } from '@/lib/passkey'
import { SUPPORTED_VALIDATION_OPTIONS } from './validation'

export const useValidationStore = defineStore('useValidationStore', () => {
	const isAccountConnected = computed(() => {
		const { selectedAccount } = useAccounts()
		const { selectedSigner } = useSigner()

		if (!selectedAccount.value) return false
		if (!selectedSigner.value) return false

		// if Smart EOA, check if the signer is EOA-Owned
		if (selectedAccount.value.category === 'Smart EOA') {
			if (selectedSigner.value.type === 'EOA-Owned') {
				if (selectedSigner.value.identifier) {
					if (isSameAddress(selectedSigner.value.identifier, selectedAccount.value.address)) {
						return true
					}
				}
			}
		}

		const vOptions = selectedAccount.value.vOptions
		for (const vOption of vOptions) {
			switch (vOption.type) {
				case 'EOA-Owned':
					if (selectedSigner.value.type === 'EOA-Owned') {
						if (isSameAddress(selectedSigner.value.identifier, vOption.identifier)) {
							return true
						}
					}
					break
				case 'Passkey':
					if (selectedSigner.value.type === 'Passkey') {
						if (selectedSigner.value.identifier === vOption.identifier) {
							return true
						}
					}
					break
			}
		}

		return false
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
