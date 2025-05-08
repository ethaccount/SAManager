import { defineStore, storeToRefs } from 'pinia'
import { createEOAOwnedValidation, createPasskeyValidation, ValidationIdentifier } from './validation'
import { useEOAWallet } from '../useEOAWallet'
import { usePasskey } from '../passkey/usePasskey'

export const useValidationStore = defineStore('useValidationStore', () => {
	const selectedSigner = ref<ValidationIdentifier | null>(null)

	const connectedSigners = computed<ValidationIdentifier[]>(() => {
		const { isEOAWalletConnected, wallet } = useEOAWallet()
		const { isLogin, credential } = usePasskey()

		let signers: ValidationIdentifier[] = []

		if (isEOAWalletConnected.value) {
			if (!wallet.address)
				throw new Error('useValidationStore: EOA wallet is connected but no address is available')
			signers.push(createEOAOwnedValidation(wallet.address))
		} else {
			if (signers.find(s => s.type === 'EOA-Owned' || s.type === 'SmartEOA')) {
				// remove EOA-Owned signer if it exists
				signers = signers.filter(s => s.type !== 'EOA-Owned' && s.type !== 'SmartEOA')
			}
		}

		if (isLogin.value) {
			if (!credential.value)
				throw new Error('useValidationStore: Passkey is logged in but no credential is available')
			signers.push(createPasskeyValidation(credential.value))
		} else {
			if (signers.find(s => s.type === 'Passkey')) {
				// remove Passkey signer if it exists
				signers = signers.filter(s => s.type !== 'Passkey')
			}
		}

		return signers
	})

	watch(connectedSigners, () => {
		if (!selectedSigner.value) return
		if (!connectedSigners.value.find(s => s.type === selectedSigner.value?.type)) {
			selectedSigner.value = null
		}
	})

	function selectSigner(type: ValidationIdentifier['type']) {
		const signer = connectedSigners.value.find(s => s.type === type)
		if (!signer) throw new Error(`useValidationStore: No signer of type ${type} is connected`)
		if (signer.type === selectedSigner.value?.type) {
			return
		}
		selectedSigner.value = signer
	}

	return {
		connectedSigners,
		selectedSigner,
		selectSigner,
	}
})

export function useValidation() {
	const store = useValidationStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
