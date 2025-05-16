import { createCredential, getCredential } from './passkeyNoRp'

type PasskeyPublicKey = {
	credentialId: string
	pubKeyX: string
	pubKeyY: string
}

export const usePasskeyNoRpStore = defineStore(
	'usePasskeyNoRpStore',
	() => {
		const publicKeys = ref<PasskeyPublicKey[]>([])
		const selectedCredentialId = ref<string | null>(null)

		const isPasskeySelected = computed(() => !!selectedCredentialId.value)

		async function createPasskey() {
			const cred = await createCredential()
			publicKeys.value.push(cred)
			selectedCredentialId.value = cred.credentialId
		}

		async function connectPasskey() {
			const cred = await getCredential({
				userVerification: 'discouraged',
			})
			selectedCredentialId.value = cred.credentialId
		}

		return {
			publicKeys,
			selectedCredentialId,
			isPasskeySelected,
			createPasskey,
			connectPasskey,
		}
	},
	{
		persist: {
			pick: ['publicKeys'],
		},
	},
)

export function usePasskeyNoRp() {
	const store = usePasskeyNoRpStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
