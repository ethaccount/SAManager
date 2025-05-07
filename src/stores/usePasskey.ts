import { PASSKEY_RP_URL } from '@/config'
import {
	deserializePasskeyCredential,
	login,
	PasskeyCredential,
	register,
	serializePasskeyCredential,
} from '@/lib/passkey'
import { defineStore, StateTree, storeToRefs } from 'pinia'

export const usePasskeyStore = defineStore(
	'usePasskeyStore',
	() => {
		const username = ref('')
		const credential = ref<PasskeyCredential | null>(null)
		const serializedCredential = computed(() => {
			if (!credential.value) {
				return null
			}
			return serializePasskeyCredential(credential.value)
		})

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
			serializedCredential,
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
				serialize: (data: StateTree) => {
					return serializePasskeyCredential(data as PasskeyCredential)
				},
				deserialize: (data: string) => {
					return deserializePasskeyCredential(data)
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
