import { PasskeyCredential } from '@/stores/passkey/types'
import { isBytes } from 'sendop'
import { createCredential, getCredential } from './passkeyNoRp'

export const usePasskeyStore = defineStore(
	'usePasskeyStore',
	() => {
		const isPasskeySupported = ref(false)
		const storedCredentials = ref<PasskeyCredential[]>([])

		const selectedCredentialId = ref<string | null>(null)

		const selectedCredential = computed(() => {
			return storedCredentials.value.find(cred => cred.credentialId === selectedCredentialId.value)
		})

		const isFullCredential = computed(() => {
			if (!selectedCredential.value) return false
			if (!isBytes(selectedCredential.value.pubKeyX)) return false
			if (!isBytes(selectedCredential.value.pubKeyY)) return false
			if (!selectedCredential.value.credentialId) return false
			return true
		})

		const isLogin = computed(() => {
			if (!selectedCredentialId.value) return false
			return true
		})

		const selectedCredentialDisplay = computed(() => {
			if (!isLogin.value) return null
			if (!isFullCredential.value) return selectedCredentialId.value
			if (selectedCredential.value?.username) return selectedCredential.value.username
			return selectedCredential.value?.credentialId
		})

		async function passkeyRegister(username: string) {
			const cred = await createCredential(username)
			storedCredentials.value.push({
				username,
				...cred,
			})
			selectedCredentialId.value = cred.credentialId
		}

		async function passkeyLogin() {
			const res = await getCredential({
				userVerification: 'discouraged',
			})
			selectedCredentialId.value = res.credentialId
		}

		async function resetCredentialId() {
			selectedCredentialId.value = null
		}

		const isPasskeyRPHealthy = ref(false)

		// unused
		async function checkPasskeyRPHealth(rpUrl: string): Promise<boolean> {
			try {
				const baseUrl = new URL(rpUrl).origin
				const healthUrl = baseUrl + '/health'
				console.log('checking passkey rp health on', healthUrl)
				const response = await fetch(healthUrl)
				const data = await response.json()
				isPasskeyRPHealthy.value = data.status === 'ok'
				return isPasskeyRPHealthy.value
			} catch {
				isPasskeyRPHealthy.value = false
				return false
			}
		}

		return {
			isPasskeySupported,
			storedCredentials,
			selectedCredentialId,
			selectedCredential,
			passkeyRegister,
			passkeyLogin,
			isLogin,
			isPasskeyRPHealthy,
			checkPasskeyRPHealth,
			resetCredentialId,
			isFullCredential,
			selectedCredentialDisplay,
		}
	},
	{
		persist: {
			pick: ['storedCredentials', 'selectedCredentialId'],
		},
	},
)

export function usePasskey() {
	const store = usePasskeyStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
