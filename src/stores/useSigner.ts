import { AppSigner, EOASigner, PasskeySigner, SignerType, ValidationMethod } from '@/lib/validations'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { useEOAWallet } from '@/stores/useEOAWallet'

export const useSignerStore = defineStore('useSignerStore', () => {
	const connectedSigners = computed<{
		[key in SignerType]: {
			identifier: string | null
			isConnected: boolean
		}
	}>(() => {
		const { isEOAWalletConnected, wallet } = useEOAWallet()
		const { isLogin, selectedCredentialId } = usePasskey()

		return {
			EOAWallet: {
				identifier: isEOAWalletConnected.value ? wallet.address : null,
				isConnected: isEOAWalletConnected.value,
			},
			Passkey: {
				identifier:
					isLogin.value && selectedCredentialId.value
						? getAuthenticatorIdHash(selectedCredentialId.value)
						: null,
				isConnected: isLogin.value,
			},
		}
	})

	function isSignerConnected(signerType: SignerType) {
		return connectedSigners.value[signerType].isConnected
	}

	const selectedSignerType = ref<SignerType | null>(null)

	const selectedSigner = computed<AppSigner | null>(() => {
		if (!selectedSignerType.value) return null
		const identifier = connectedSigners.value[selectedSignerType.value].identifier
		if (!identifier) {
			return null
		}

		// Create actual Signer instances based on type
		switch (selectedSignerType.value) {
			case 'EOAWallet':
				const { signer } = useEOAWallet()
				if (!signer.value) return null
				return new EOASigner(identifier, signer.value)
			case 'Passkey':
				return new PasskeySigner(identifier)
			default:
				return null
		}
	})

	function selectSigner(signerType: SignerType) {
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

	function canSign(vMethod: ValidationMethod): boolean {
		return (
			vMethod.signerType === selectedSignerType.value && vMethod.identifier === selectedSigner.value?.identifier
		)
	}

	return {
		connectedSigners,
		selectedSigner,
		selectedSignerType,
		selectSigner,
		canSign,
		isSignerConnected,
	}
})

export function useSigner() {
	const store = useSignerStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
