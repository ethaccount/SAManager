export const useEmailRecoveryStore = defineStore(
	'useEmailRecoveryStore',
	() => {
		const accountToNewOwnerAddress = ref<Record<string, string>>({})

		return {
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
