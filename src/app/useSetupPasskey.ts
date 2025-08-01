import { usePasskey } from '@/stores/passkey/usePasskey'

export function useSetupPasskey() {
	const { selectedCredentialId, isFullCredential, resetCredentialId, isPasskeySupported } = usePasskey()

	async function setupPasskey() {
		// Only auto recognize as logged in if the selected credential is stored in local storage and is full
		// Because the full credential has username,
		// the user can know which credential should be selected when signing transaction
		if (selectedCredentialId.value && !isFullCredential.value) {
			resetCredentialId()
		}

		// Check if passkey is supported by the browser
		try {
			// throw new Error('test')
			if (
				window.PublicKeyCredential &&
				typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
			) {
				isPasskeySupported.value = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
			} else {
				isPasskeySupported.value = false
			}
		} catch (err) {
			isPasskeySupported.value = false
			console.error('Error checking passkey support:', err)
		}
	}

	return {
		setupPasskey,
	}
}
