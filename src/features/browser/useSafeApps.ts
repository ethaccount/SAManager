import { Methods, RPCPayload } from '@/features/browser/types'
import { useAccount } from '@/stores/account/useAccount'
import { displayChainName } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useExecutionModal, type ExecutionModalExecution } from '@/components/ExecutionModal'
import { getAddress, isAddress } from 'ethers'
import { SafeAppsCommunicator } from './SafeAppsCommunicator'
import { SafeAppsTransaction, SignMessageParams, SignTypedMessageParams } from './types'

export function useSafeApps() {
	const { selectedAccount } = useAccount()
	const { selectedChainId, client, explorerUrl } = useBlockchain()
	const { openModal } = useExecutionModal()

	const communicatorRef = ref<SafeAppsCommunicator>()

	function initialize(iframe: HTMLIFrameElement) {
		const communicator = new SafeAppsCommunicator(iframe)
		communicatorRef.value = communicator

		// getSafeInfo method
		communicator.on(Methods.getSafeInfo, async () => {
			if (!selectedAccount.value) {
				throw new Error('No account selected')
			}

			return {
				safeAddress: selectedAccount.value.address,
				chainId: Number(selectedChainId.value), // For cow swap, chainId must be a number instead of string
				owners: [selectedAccount.value.address], // Smart account as owner
				threshold: 1,
				isReadOnly: false,
			}
		})

		// getEnvironmentInfo method
		communicator.on(Methods.getEnvironmentInfo, async () => ({
			origin: document.location.origin,
		}))

		// getChainInfo method
		communicator.on(Methods.getChainInfo, async () => ({
			chainId: Number(selectedChainId.value),
			chainName: displayChainName(selectedChainId.value),
			shortName: getChainShortName(selectedChainId.value),
			nativeCurrency: {
				name: 'Ether',
				symbol: 'ETH',
				decimals: 18,
			},
			blockExplorerUriTemplate: {
				address: `${explorerUrl.value}/address/{{address}}`,
				txHash: `${explorerUrl.value}/tx/{{txHash}}`,
				api: `${explorerUrl.value}/api?module={{module}}&action={{action}}&address={{address}}&apikey={{apiKey}}`,
			},
		}))

		// rpcCall method
		communicator.on(Methods.rpcCall, async msg => {
			const payload = msg.data.params as RPCPayload

			// ignore eth_estimateGas
			if (payload.call === 'eth_estimateGas') {
				return '0x0'
			}

			try {
				const response = await client.value.send(payload.call, payload.params)
				return response
			} catch (err) {
				console.error('RPC call error:', err)
				throw err
			}
		})

		// sendTransactions method
		communicator.on(Methods.sendTransactions, async msg => {
			const params = msg.data.params as {
				txs: SafeAppsTransaction[]
			}

			if (!params.txs || params.txs.length === 0) {
				throw new Error('[useSafeApps#sendTransactions] No transactions provided')
			}

			// Convert SafeAppsTransaction to ExecutionModalExecution
			const executions: ExecutionModalExecution[] = params.txs.map((tx: SafeAppsTransaction) => {
				const processedTx: ExecutionModalExecution = {
					to: isAddress(tx.to) ? getAddress(tx.to) : tx.to,
					value: BigInt(tx.value || '0'),
					data: tx.data || '0x',
				}

				return processedTx
			})

			const messageId = msg.data.id

			// Open ExecutionModal
			openModal({
				executions,
				// TODO: this doesn't work
				onSuccess: () => {
					// Send success response back to Safe app
					communicatorRef.value?.send(
						{ txHash: 'success' }, // Will be updated with actual hash
						messageId,
					)
				},
				onFailed: () => {
					// Send error response back to Safe app
					communicatorRef.value?.send('Transaction failed', messageId, true)
				},
			})
		})

		// signMessage method
		communicator.on(Methods.signMessage, async msg => {
			const { message } = msg.data.params as SignMessageParams

			console.log('message', message)

			// TODO:
			// throw new Error('Message signing not yet implemented')
		})

		// signTypedMessage method
		communicator.on(Methods.signTypedMessage, async msg => {
			const { typedData } = msg.data.params as SignTypedMessageParams

			console.log('typedData', typedData)

			// TODO:
			throw new Error('Typed message signing not yet implemented')
		})
	}

	return {
		communicator: communicatorRef,
		initialize,
	}
}

function getChainShortName(chainId: string): string {
	const shortNames: Record<string, string> = {
		'1': 'eth',
		'11155111': 'sep',
		'421614': 'arb-sep',
		'11155420': 'op-sep',
		'84532': 'base-sep',
		'80002': 'polygon-amoy',
		'1337': 'local',
	}
	return shortNames[chainId] || 'unknown'
}
