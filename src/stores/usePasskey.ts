import { PASSKEY_RP_URL } from '@/config'
import { login, PasskeyCredential, register } from '@/lib/passkey'
import { defineStore, storeToRefs } from 'pinia'

export const usePasskeyStore = defineStore(
	'usePasskeyStore',
	() => {
		const username = ref('')
		const credential = ref<PasskeyCredential | null>(null)

		const isLogin = computed(() => !!credential.value && !!username.value)

		async function passkeyRegister(_username: string) {
			const res = await register(_username)
			username.value = _username
			credential.value = res
		}

		async function passkeyLogin(_username: string) {
			const res = await login()
			username.value = _username
			credential.value = res
		}

		async function passkeyLogout() {
			username.value = ''
			credential.value = null
		}

		const isPasskeyRPHealthy = ref(false)

		onMounted(async () => {
			await checkPasskeyRPHealth()
		})

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
			username,
			credential,
			passkeyRegister,
			passkeyLogin,
			isLogin,
			passkeyLogout,
			isPasskeyRPHealthy,
			checkPasskeyRPHealth,
		}
	},
	{
		persist: {
			pick: ['username', 'credential'],
			serializer: {
				serialize: value => {
					// Convert BigInt to string during serialization
					return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() + 'n' : v))
				},
				deserialize: value => {
					// Convert string back to BigInt during deserialization
					return JSON.parse(value, (_, v) => {
						if (typeof v === 'string' && /^\d+n$/.test(v)) {
							return BigInt(v.slice(0, -1))
						}
						return v
					})
				},
			},
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
