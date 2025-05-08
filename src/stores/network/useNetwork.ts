import { ALCHEMY_API_KEY, IS_DEV, PIMLICO_API_KEY } from '@/config'
import {
	CHAIN_ID,
	EXPLORER_URL,
	SUPPORTED_BUNDLER,
	SUPPORTED_ENTRY_POINT,
	SUPPORTED_NODE,
} from '@/stores/network/network'
import { JsonRpcProvider } from 'ethers'
import { alchemy, publicNode } from 'evm-providers'
import { defineStore } from 'pinia'
import { ADDRESS, AlchemyBundler, Bundler, EntryPointVersion, PimlicoBundler, PublicPaymaster } from 'sendop'

export const DEFAULT_CHAIN_ID = IS_DEV ? CHAIN_ID.LOCAL : CHAIN_ID.SEPOLIA
export const DEFAULT_ENTRY_POINT_VERSION: EntryPointVersion = 'v0.7'
export const DEFAULT_NODE = SUPPORTED_NODE.ALCHEMY
export const DEFAULT_BUNDLER = SUPPORTED_BUNDLER.PIMLICO

export const useNetworkStore = defineStore(
	'useNetworkStore',
	() => {
		const selectedChainId = ref<CHAIN_ID>(DEFAULT_CHAIN_ID)
		const chainIdBigInt = computed(() => BigInt(selectedChainId.value))

		const supportedChainIds = computed(() => {
			if (IS_DEV) {
				return Object.values(CHAIN_ID)
			}
			return Object.values(CHAIN_ID).filter(id => id !== CHAIN_ID.LOCAL)
		})

		const supportedNodes = computed(() => {
			return Object.values(SUPPORTED_NODE)
		})
		const selectedNode = ref<SUPPORTED_NODE>(DEFAULT_NODE)

		const rpcUrl = computed(() => {
			switch (selectedNode.value) {
				case SUPPORTED_NODE.ALCHEMY:
					return alchemy(Number(selectedChainId.value) as any, ALCHEMY_API_KEY)
				case SUPPORTED_NODE.PUBLIC_NODE:
					return publicNode(Number(selectedChainId.value) as any)
			}
		})

		const explorerUrl = computed(() => `${EXPLORER_URL[selectedChainId.value]}`)

		const supportedEntryPoints = computed<SUPPORTED_ENTRY_POINT[]>(() => {
			return ['v0.7', 'v0.8']
		})

		const selectedEntryPoint = ref<EntryPointVersion>(DEFAULT_ENTRY_POINT_VERSION)

		function switchEntryPoint(entryPoint: EntryPointVersion) {
			selectedEntryPoint.value = entryPoint
		}

		const supportedBundlers = computed<SUPPORTED_BUNDLER[]>(() => {
			return Object.values(SUPPORTED_BUNDLER)
		})

		const selectedBundler = ref<SUPPORTED_BUNDLER>(DEFAULT_BUNDLER)

		const bundlerUrl = computed(() => {
			if (selectedChainId.value === CHAIN_ID.LOCAL) {
				return `http://localhost:4337`
			}
			switch (selectedBundler.value) {
				case SUPPORTED_BUNDLER.PIMLICO:
					return `https://api.pimlico.io/v2/${selectedChainId.value}/rpc?apikey=${PIMLICO_API_KEY}`
				case SUPPORTED_BUNDLER.ALCHEMY:
					return alchemy(Number(selectedChainId.value) as any, ALCHEMY_API_KEY)
			}
		})

		const client = computed(() => new JsonRpcProvider(rpcUrl.value))
		const clientNoBatch = computed(() => new JsonRpcProvider(rpcUrl.value, undefined, { batchMaxCount: 1 }))

		const bundler = computed<Bundler>(() => {
			const bundlerOptions = {
				parseError: true,
				debug: true,
				entryPointVersion: selectedEntryPoint.value,
			}

			switch (selectedBundler.value) {
				case SUPPORTED_BUNDLER.PIMLICO:
					return new PimlicoBundler(chainIdBigInt.value, bundlerUrl.value, bundlerOptions)
				case SUPPORTED_BUNDLER.ALCHEMY:
					return new AlchemyBundler(chainIdBigInt.value, bundlerUrl.value, bundlerOptions)
			}
		})

		const pmGetter = computed(() => new PublicPaymaster(ADDRESS.PublicPaymaster))

		return {
			selectedChainId,
			supportedChainIds,
			rpcUrl,
			explorerUrl,
			client,
			clientNoBatch,
			bundlerUrl,
			bundler,
			supportedBundlers,
			selectedEntryPoint,
			selectedBundler,
			selectedNode,
			pmGetter,
			supportedNodes,
			supportedEntryPoints,
			chainIdBigInt,
			switchEntryPoint,
		}
	},
	{
		persist: {
			pick: ['selectedChainId', 'selectedBundler', 'selectedNode'],
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
