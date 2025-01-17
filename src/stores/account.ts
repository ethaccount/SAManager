import { AccountId, ValidatorKey } from '@/types'
import { defineStore, storeToRefs } from 'pinia'

export type ConnectedAccount = {
	address: string
	chainId: string
	validator: ValidatorKey
	vendor: AccountId
}

export const useAccountStore = defineStore(
	'useAccountStore',
	() => {
		const account = ref<ConnectedAccount | null>(null)

		const setAccount = (_account: ConnectedAccount) => {
			account.value = _account
		}

		const resetAccount = () => {
			account.value = null
		}

		const isConnected = computed(() => {
			return account.value !== null
		})

		return {
			account,
			setAccount,
			resetAccount,
			isConnected,
		}
	},
	{
		persist: {
			pick: ['account'],
		},
	},
)

export function useAccount() {
	const store = useAccountStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
