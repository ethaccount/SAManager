import { IS_DEV } from '@/config'
import { BUNDLER_URL, CHAIN_ID, EXPLORER_URL, RPC_URL } from '@/lib/network'
import { JsonRpcProvider } from 'ethers'
import { defineStore } from 'pinia'
import { ADDRESS, AlchemyBundler, PimlicoBundler, PublicPaymaster } from 'sendop'

const DEFAULT_CHAIN_ID = IS_DEV ? CHAIN_ID.LOCAL : CHAIN_ID.SEPOLIA

export const useNetworkStore = defineStore(
	'useNetworkStore',
	() => {
		const chainId = ref<CHAIN_ID>(DEFAULT_CHAIN_ID)
		const chainIdBigInt = computed(() => BigInt(chainId.value))

		function setChainId(id: CHAIN_ID) {
			chainId.value = id
		}

		const chainIds = computed(() => {
			if (IS_DEV) {
				return Object.values(CHAIN_ID)
			}
			return Object.values(CHAIN_ID).filter(id => id !== CHAIN_ID.LOCAL)
		})

		const rpcUrl = computed(() => RPC_URL[chainId.value])

		const explorerUrl = computed(() => `${EXPLORER_URL[chainId.value]}`)

		const client = computed(() => new JsonRpcProvider(rpcUrl.value))
		const clientNoBatch = computed(() => new JsonRpcProvider(rpcUrl.value, undefined, { batchMaxCount: 1 }))

		const bundlerUrl = computed(() => BUNDLER_URL[chainId.value])
		const bundler = computed(() => {
			if (bundlerUrl.value.includes('alchemy')) {
				return new AlchemyBundler(chainIdBigInt.value, bundlerUrl.value, {
					parseError: true,
				})
			}
			return new PimlicoBundler(chainIdBigInt.value, bundlerUrl.value, {
				parseError: true,
			})
		})

		const pmGetter = computed(() => new PublicPaymaster(ADDRESS.PublicPaymaster))

		return {
			chainId,
			chainIds,
			rpcUrl,
			explorerUrl,
			client,
			clientNoBatch,
			bundlerUrl,
			bundler,
			setChainId,
			pmGetter,
		}
	},
	{
		persist: {
			pick: ['chainId'],
		},
	},
)

export function useNetwork() {
	const store = useNetworkStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
