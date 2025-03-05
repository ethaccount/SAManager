import { login, PasskeyCredential, register } from '@/lib/passkey'
import { defineStore, storeToRefs } from 'pinia'

export const usePasskeyStore = defineStore(
	'usePasskeyStore',
	() => {
		const username = ref('')
		const credential = ref<PasskeyCredential | null>(null)

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

		const isLogin = computed(() => !!credential.value && !!username.value)

		return { username, credential, passkeyRegister, passkeyLogin, isLogin }
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
