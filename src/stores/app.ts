import { CHAIN_ID, CHARITY_PAYMASTER, PIMLICO_API_KEY, RPC_URL } from '@/config'
import { JsonRpcProvider } from 'ethers'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { PimlicoBundler } from '@/core/bundler'
import { MyPaymaster } from '@/core/pm_builders'

export const useAppStore = defineStore('useAppStore', () => {
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

	const setChainId = (id: CHAIN_ID) => {
		chainId.value = id
	}

	const pmBuilder = computed(() => {
		return new MyPaymaster({
			chainId: chainId.value,
			clientUrl: rpcUrl.value,
			paymasterAddress: CHARITY_PAYMASTER,
		})
	})

	return {
		chainId,
		rpcUrl,
		client,
		bundlerUrl,
		bundler,
		setChainId,
		pmBuilder,
	}
})

export function useApp() {
	const appStore = useAppStore()
	return {
		...appStore,
		...storeToRefs(appStore),
	}
}
