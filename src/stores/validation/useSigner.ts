import { defineStore, storeToRefs } from 'pinia'
import { ValidationIdentifier } from './validation'
import { useEOAWallet } from '../useEOAWallet'
import { usePasskey } from '../usePasskey'

export const useSignerStore = defineStore('useSignerStore', () => {
	const selectedSigner = ref<ValidationIdentifier | null>(null)

	const connectedSigners = computed<ValidationIdentifier[]>(() => {
		const { isEOAWalletConnected, wallet } = useEOAWallet()
		const { isLogin, credential } = usePasskey()

		let signers: ValidationIdentifier[] = []

		if (isEOAWalletConnected.value) {
			if (!wallet.address) throw new Error('useSignerStore: EOA wallet is connected but no address is available')
			signers.push({
				type: 'EOA-Owned',
				identifier: wallet.address,
			})
		} else {
			if (signers.find(s => s.type === 'EOA-Owned')) {
				// remove EOA-Owned signer if it exists
				signers = signers.filter(s => s.type !== 'EOA-Owned')
			}
		}

		if (isLogin.value) {
			if (!credential.value)
				throw new Error('useSignerStore: Passkey is logged in but no credential is available')
			signers.push({
				type: 'Passkey',
				identifier: credential.value.authenticatorIdHash,
			})
		} else {
			if (signers.find(s => s.type === 'Passkey')) {
				// remove Passkey signer if it exists
				signers = signers.filter(s => s.type !== 'Passkey')
			}
		}

		return signers
	})

	function selectSigner(type: ValidationIdentifier['type']) {
		const signer = connectedSigners.value.find(s => s.type === type)
		if (!signer) throw new Error(`useSignerStore: No signer of type ${type} is connected`)
		selectedSigner.value = signer
	}

	return {
		connectedSigners,
		selectedSigner,
		selectSigner,
	}
})

export function useSigner() {
	const store = useSignerStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
