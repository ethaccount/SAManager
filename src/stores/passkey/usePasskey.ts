import { PASSKEY_RP_URL } from '@/config'
import { PasskeyCredential } from '@/stores/passkey/passkey'
import { createCredential, getCredential } from './passkeyNoRp'

export const usePasskeyStore = defineStore(
	'usePasskeyStore',
	() => {
		const storedCredentials = ref<PasskeyCredential[]>([])

		const selectedCredentialId = ref<string | null>(null)

		const selectedCredential = computed(() => {
			return storedCredentials.value.find(cred => cred.credentialId === selectedCredentialId.value)
		})

		const isLogin = computed(() => !!selectedCredentialId.value)

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

		// onMounted(async () => {
		// 	await checkPasskeyRPHealth()
		// })

		async function checkPasskeyRPHealth(): Promise<boolean> {
			try {
				const baseUrl = new URL(PASSKEY_RP_URL).origin
				const healthUrl = baseUrl + '/health'
				console.log('checking passkey rp health on', healthUrl)
				const response = await fetch(healthUrl)
				const data = await response.json()
				isPasskeyRPHealthy.value = data.status === 'ok'
				return isPasskeyRPHealthy.value
			} catch (error: unknown) {
				isPasskeyRPHealthy.value = false
				return false
			}
		}

		return {
			storedCredentials,
			selectedCredential,
			passkeyRegister,
			passkeyLogin,
			isLogin,
			isPasskeyRPHealthy,
			checkPasskeyRPHealth,
			resetCredentialId,
		}
	},
	{
		persist: {
			pick: ['storedCredentials'],
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
