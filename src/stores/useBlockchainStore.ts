import { CHAIN_ID, CHARITY_PAYMASTER, PIMLICO_API_KEY, RPC_URL } from '@/config'
import { MyPaymaster } from '@/core/pmGetter'
import { JsonRpcProvider } from 'ethers'
import { defineStore } from 'pinia'
import { PimlicoBundler } from 'sendop'

export const useBlockchainStore = defineStore('useBlockchainStore', () => {
	const chainId = ref<CHAIN_ID>(CHAIN_ID.SEPOLIA)
	const rpcUrl = computed(() => {
		if (chainId.value === CHAIN_ID.SEPOLIA) {
			return RPC_URL
		} else {
			throw new Error('rpcUrl: Unsupported chain')
		}
	})

	const bundlerUrl = computed(() => `https://api.pimlico.io/v2/${chainId.value}/rpc?apikey=${PIMLICO_API_KEY}`)
	const client = computed(() => {
		return new JsonRpcProvider(rpcUrl.value)
	})
	const bundler = computed(() => {
		return new PimlicoBundler(chainId.value, bundlerUrl.value)
	})
	const pmGetter = computed(() => {
		return new MyPaymaster({
			client: client.value,
			paymasterAddress: CHARITY_PAYMASTER,
		})
	})

	const setChainId = (id: CHAIN_ID) => {
		chainId.value = id
	}

	return {
		chainId,
		rpcUrl,
		client,
		bundlerUrl,
		bundler,
		setChainId,
		pmGetter,
	}
})

export function useBlockchain() {
	const blockchainStore = useBlockchainStore()
	return {
		...blockchainStore,
		...storeToRefs(blockchainStore),
	}
}
