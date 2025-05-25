import { usePasskey } from '@/stores/passkey/usePasskey'

export function usePasskeyAutoConnect() {
	const { selectedCredentialId, isFullCredential, resetCredentialId } = usePasskey()

	// Only auto recognize as logged in if the selected credential is stored in local storage and is full
	// Because the full credential has username,
	// the user can know which credential should be selected when signing transaction
	onMounted(() => {
		if (selectedCredentialId.value && !isFullCredential.value) {
			resetCredentialId()
		}
	})
}
