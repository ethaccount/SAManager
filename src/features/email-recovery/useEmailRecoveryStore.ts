export const useEmailRecoveryStore = defineStore(
	'useEmailRecoveryStore',
	() => {
		const accountToEmail = ref<Record<string, string>>({})
		const accountToNewOwnerAddress = ref<Record<string, string>>({})

		return {
			accountToEmail,
			accountToNewOwnerAddress,
		}
	},
	{
		persist: true,
	},
)

export function useEmailRecovery() {
	const store = useEmailRecoveryStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
