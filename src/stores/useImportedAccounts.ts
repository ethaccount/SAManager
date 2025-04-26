import { defineStore, storeToRefs } from 'pinia'

export type ImportedAccount = {
	address: string
	chainId: bigint
	validationTypes: ValidationType[]
	accountId: string
	type: 'SA' | '7702'
	isDeployed: boolean
	isModular: boolean
	supportedEps: string[]
}

export type ValidationType = {
	type: 'EOA' | 'Passkey'
	publicKey: string
}

export const useImportedAccountsStore = defineStore('useImportedAccountsStore', () => {
	const importedAccounts = ref<ImportedAccount[]>([
		{
			address: '0x0000000000000000000000000000000000000000',
			chainId: 11155111n,
			validationTypes: [],
			accountId: '1',
			type: 'SA',
			isDeployed: true,
			isModular: true,
			supportedEps: [],
		},
	])
	const hasImportedAccounts = computed(() => importedAccounts.value.length > 0)

	return {
		importedAccounts,
		hasImportedAccounts,
	}
})

export function useImportedAccounts() {
	const store = useImportedAccountsStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
