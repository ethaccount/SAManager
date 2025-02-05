import { ECDSA_VALIDATOR } from '@/config'
import { AccountId, ValidatorKey } from '@/types'
import { defineStore, storeToRefs } from 'pinia'
import { ECDSAValidator, ERC7579Validator, Kernel, MyAccount, SmartAccount } from 'sendop'
import { useBlockchain } from './useBlockchainStore'
import { useEthers } from './ethers'

export type ConnectedAccount = {
	address: string
	chainId: string
	validator: ValidatorKey
	accountId: AccountId
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

		const { client, bundler, pmGetter } = useBlockchain()
		const { signer } = useEthers()

		watch(account, account => {
			console.log('account', account)
		})

		const erc7579Validator = computed<ERC7579Validator | null>(() => {
			if (!signer.value) {
				return null
			}

			switch (account.value?.validator) {
				case 'eoa':
					return new ECDSAValidator({
						address: ECDSA_VALIDATOR,
						client: client.value,
						signer: signer.value,
					})

				default:
					return null
			}
		})

		const smartAccount = computed<SmartAccount | null>(() => {
			if (!erc7579Validator.value) {
				return null
			}

			switch (account.value?.accountId) {
				case AccountId.KERNEL:
					return new Kernel(account.value?.address, {
						client: client.value,
						bundler: bundler.value,
						erc7579Validator: erc7579Validator.value,
						pmGetter: pmGetter.value,
					})
				case AccountId.MY_ACCOUNT:
					return new MyAccount(account.value?.address, {
						client: client.value,
						bundler: bundler.value,
						erc7579Validator: erc7579Validator.value,
						pmGetter: pmGetter.value,
					})
				default:
					return null
			}
		})

		return {
			account,
			setAccount,
			resetAccount,
			isConnected,
			smartAccount,
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
