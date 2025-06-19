import { IS_DEV } from '@/config'
import {
	CHAIN_ID,
	EXPLORER_URL,
	SUPPORTED_BUNDLER,
	SUPPORTED_ENTRY_POINT,
	SUPPORTED_NODE,
	TESTNET_CHAIN_ID,
} from '@/stores/blockchain/blockchain'
import { JsonRpcProvider } from 'ethers'
import { publicNode, PublicNodeChain } from 'evm-providers'
import { defineStore } from 'pinia'
import { ADDRESS, AlchemyBundler, Bundler, EntryPointVersion, PimlicoBundler, PublicPaymaster } from 'sendop'

export const DEFAULT_CHAIN_ID = TESTNET_CHAIN_ID.SEPOLIA
export const DEFAULT_ENTRY_POINT_VERSION: EntryPointVersion = 'v0.7'
export const DEFAULT_NODE = SUPPORTED_NODE.ALCHEMY
export const DEFAULT_BUNDLER = SUPPORTED_BUNDLER.PIMLICO

function getAlchemyUrl(chainId: CHAIN_ID) {
	return `${window.location.origin}/api/provider?chainId=${chainId}&provider=alchemy`
}

function getPimlicoUrl(chainId: CHAIN_ID) {
	return `${window.location.origin}/api/provider?chainId=${chainId}&provider=pimlico`
}

function getTenderlyUrl(chainId: CHAIN_ID) {
	return `${window.location.origin}/api/provider?chainId=${chainId}&provider=tenderly`
}

export const useBlockchainStore = defineStore(
	'useBlockchainStore',
	() => {
		const selectedChainId = ref<CHAIN_ID>(DEFAULT_CHAIN_ID)
		const chainIdBigInt = computed(() => BigInt(selectedChainId.value))

		const supportedChainIds = computed(() => {
			if (IS_DEV) {
				return Object.values(TESTNET_CHAIN_ID)
			}
			return Object.values(TESTNET_CHAIN_ID).filter(id => id !== TESTNET_CHAIN_ID.LOCAL)
		})

		const supportedNodes = computed(() => {
			return Object.values(SUPPORTED_NODE)
		})
		const selectedNode = ref<SUPPORTED_NODE>(DEFAULT_NODE)

		const rpcUrl = computed(() => {
			switch (selectedNode.value) {
				case SUPPORTED_NODE.ALCHEMY:
					return getAlchemyUrl(selectedChainId.value)
				case SUPPORTED_NODE.PUBLIC_NODE:
					return publicNode(Number(selectedChainId.value) as PublicNodeChain)
				default:
					return getAlchemyUrl(selectedChainId.value)
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
			if (selectedChainId.value === TESTNET_CHAIN_ID.LOCAL) {
				return `http://localhost:4337`
			}
			switch (selectedBundler.value) {
				case SUPPORTED_BUNDLER.PIMLICO:
					return getPimlicoUrl(selectedChainId.value)
				case SUPPORTED_BUNDLER.ALCHEMY:
					return getAlchemyUrl(selectedChainId.value)
				default:
					return getAlchemyUrl(selectedChainId.value)
			}
		})

		const client = computed(() => new JsonRpcProvider(rpcUrl.value, undefined, { staticNetwork: true }))
		const clientNoBatch = computed(
			() => new JsonRpcProvider(rpcUrl.value, undefined, { batchMaxCount: 1, staticNetwork: true }),
		)

		// only for fetching event logs
		const tenderlyClient = computed<JsonRpcProvider | null>(() => {
			return new JsonRpcProvider(getTenderlyUrl(selectedChainId.value), undefined, {
				staticNetwork: true,
			})
		})

		const bundler = computed<Bundler>(() => {
			const bundlerOptions = {
				parseError: true,
				entryPointVersion: selectedEntryPoint.value,
			}

			switch (selectedBundler.value) {
				case SUPPORTED_BUNDLER.PIMLICO:
					return new PimlicoBundler(chainIdBigInt.value, bundlerUrl.value, bundlerOptions)
				case SUPPORTED_BUNDLER.ALCHEMY:
					return new AlchemyBundler(chainIdBigInt.value, bundlerUrl.value, bundlerOptions)
				default:
					return new AlchemyBundler(chainIdBigInt.value, bundlerUrl.value, bundlerOptions)
			}
		})

		const pmGetter = computed(() => new PublicPaymaster(ADDRESS.PublicPaymaster))

		function switchChain(chainId: CHAIN_ID) {
			selectedChainId.value = chainId
		}

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
			tenderlyClient,
			switchEntryPoint,
			switchChain,
		}
	},
	{
		persist: {
			pick: ['selectedChainId', 'selectedBundler', 'selectedNode'],
		},
	},
)

export function useBlockchain() {
	const store = useBlockchainStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
