import { DEFAULT_BUNDLER, DEFAULT_CHAIN_ID, DEFAULT_NODE, SUPPORTED_MAINNET_CHAIN_IDS } from '@/config'
import {
	CHAIN_ID,
	EXPLORER_URL,
	SUPPORTED_BUNDLER,
	SUPPORTED_ENTRY_POINT,
	SUPPORTED_NODE,
	TESTNET_CHAIN_ID,
} from '@/stores/blockchain/chains'
import { getAddress, JsonRpcProvider } from 'ethers'
import { publicNode, PublicNodeChain } from 'evm-providers'
import { defineStore } from 'pinia'
import {
	ENTRY_POINT_V07_ADDRESS,
	ENTRY_POINT_V08_ADDRESS,
	ERC4337Bundler,
	ERC4337BundlerOptions,
	fetchGasPriceAlchemy,
	fetchGasPricePimlico,
} from 'sendop'

export const useBlockchainStore = defineStore(
	'useBlockchainStore',
	() => {
		const selectedChainId = ref<CHAIN_ID>(DEFAULT_CHAIN_ID)

		const chainIdBigInt = computed(() => BigInt(selectedChainId.value))
		const supportedChainIds = computed<CHAIN_ID[]>(() => {
			switch (import.meta.env.MODE) {
				case 'staging':
					if (import.meta.env.PROD) {
						return Object.values(TESTNET_CHAIN_ID).filter(id => id !== TESTNET_CHAIN_ID.LOCAL)
					}
					return Object.values(TESTNET_CHAIN_ID)
				case 'production':
					return SUPPORTED_MAINNET_CHAIN_IDS
				default:
					throw new Error(`[supportedChainIds] Invalid mode: ${import.meta.env.MODE}`)
			}
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

		const supportedBundlers = computed<SUPPORTED_BUNDLER[]>(() => {
			return Object.values(SUPPORTED_BUNDLER)
		})

		const selectedBundler = ref<SUPPORTED_BUNDLER>(DEFAULT_BUNDLER)

		const currentEntryPointAddress = ref<string>(ENTRY_POINT_V07_ADDRESS)

		function setEntryPointAddress(entryPointAddress: string) {
			currentEntryPointAddress.value = entryPointAddress
		}

		const bundlerUrl = computed(() => {
			if (selectedChainId.value === TESTNET_CHAIN_ID.LOCAL) {
				return `http://localhost:4337`
			}
			switch (selectedBundler.value) {
				case SUPPORTED_BUNDLER.PIMLICO:
					return getPimlicoUrl(selectedChainId.value)
				case SUPPORTED_BUNDLER.ALCHEMY:
					return getAlchemyUrl(selectedChainId.value)
				case SUPPORTED_BUNDLER.ETHERSPOT:
					switch (getAddress(currentEntryPointAddress.value)) {
						case getAddress(ENTRY_POINT_V07_ADDRESS):
							return getEtherspotTestnetUrl(selectedChainId.value, 'v0.7')
						case getAddress(ENTRY_POINT_V08_ADDRESS):
							return getEtherspotTestnetUrl(selectedChainId.value, 'v0.8')
						default:
							throw new Error(`Invalid entry point address: ${currentEntryPointAddress.value}`)
					}
				case SUPPORTED_BUNDLER.CANDIDE:
					return getCandideUrl(selectedChainId.value)
				default:
					return getAlchemyUrl(selectedChainId.value)
			}
		})

		function getAlchemyUrl(chainId: CHAIN_ID) {
			return `${window.location.origin}/api/provider?chainId=${chainId}&provider=alchemy`
		}

		function getPimlicoUrl(chainId: CHAIN_ID) {
			return `${window.location.origin}/api/provider?chainId=${chainId}&provider=pimlico`
		}

		function getTenderlyUrl(chainId: CHAIN_ID) {
			return `${window.location.origin}/api/provider?chainId=${chainId}&provider=tenderly`
		}

		function getEtherspotTestnetUrl(chainId: CHAIN_ID, entryPointVersion: SUPPORTED_ENTRY_POINT) {
			switch (entryPointVersion) {
				case 'v0.7':
					return `${window.location.origin}/api/provider?chainId=${chainId}&provider=etherspot-v2`
				case 'v0.8':
					return `${window.location.origin}/api/provider?chainId=${chainId}&provider=etherspot-v3`
			}
		}

		function getCandideUrl(chainId: CHAIN_ID) {
			return `${window.location.origin}/api/provider?chainId=${chainId}&provider=candide`
		}

		const client = computed(
			() => new JsonRpcProvider(rpcUrl.value, Number(selectedChainId.value), { staticNetwork: true }),
		)

		const clientNoBatch = computed(
			() =>
				new JsonRpcProvider(rpcUrl.value, Number(selectedChainId.value), {
					batchMaxCount: 1,
					staticNetwork: true,
				}),
		)

		// only for fetching event logs
		const tenderlyClient = computed<JsonRpcProvider | null>(() => {
			return new JsonRpcProvider(getTenderlyUrl(selectedChainId.value), Number(selectedChainId.value), {
				staticNetwork: true,
			})
		})

		const bundler = computed<ERC4337Bundler>(() => {
			// disables pre-fetching eth_chainId (Note that ethersport bundler does not support eth_chainId)
			const options: ERC4337BundlerOptions = {
				staticNetwork: true,
			}

			// Candide doesn't support RPC batching
			if (selectedBundler.value === SUPPORTED_BUNDLER.CANDIDE) {
				options.batchMaxCount = 1
			}

			return new ERC4337Bundler(bundlerUrl.value, Number(selectedChainId.value), options)
		})

		function switchChain(chainId: CHAIN_ID) {
			selectedChainId.value = chainId
		}

		async function fetchGasPrice() {
			switch (selectedBundler.value) {
				case SUPPORTED_BUNDLER.PIMLICO:
					return await fetchGasPricePimlico(getPimlicoUrl(selectedChainId.value))
				case SUPPORTED_BUNDLER.ALCHEMY:
					return await fetchGasPriceAlchemy(getAlchemyUrl(selectedChainId.value))
				case SUPPORTED_BUNDLER.CANDIDE:
					// use Pimlico for gas prices (alchemy may fail when using candide)
					return await fetchGasPricePimlico(getPimlicoUrl(selectedChainId.value))
				default:
					return await fetchGasPriceAlchemy(getAlchemyUrl(selectedChainId.value))
			}
		}

		return {
			selectedChainId,
			currentEntryPointAddress,
			supportedChainIds,
			rpcUrl,
			explorerUrl,
			client,
			clientNoBatch,
			bundlerUrl,
			bundler,
			supportedBundlers,
			selectedBundler,
			selectedNode,
			supportedNodes,
			supportedEntryPoints,
			chainIdBigInt,
			tenderlyClient,
			switchChain,
			fetchGasPrice,
			setEntryPointAddress,
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
