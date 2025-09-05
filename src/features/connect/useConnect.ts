import { handleGetCapabilities, PendingRequest } from '@/features/connect'
import { validateWalletSendCallsParams } from '@/features/connect/wallet_sendCalls'
import { handleWalletSwitchEthereumChain } from '@/features/connect/wallet_switchEthereumChain'
import { getErrorMessage } from '@/lib/error'
import { useBlockchain } from '@/stores/blockchain'
import {
	EthereumRpcError,
	standardErrors,
	WalletGetCapabilitiesRequest,
	WalletGetCapabilitiesResponse,
	WalletSendCallsRequest,
	WalletSwitchEthereumChainRequest,
} from '@samanager/sdk'

export function useConnect() {
	const error = ref<string | null>(null)
	const pendingRequest = ref<PendingRequest | null>(null)
	const isLoading = ref(false)

	const method = computed(() => {
		return pendingRequest.value?.method
	})

	function walletRequestHandler(method: string, params: unknown[]) {
		return new Promise(async (resolve, reject) => {
			pendingRequest.value = { method, params, resolve, reject }
			isLoading.value = true
			let result
			let shouldResolveImmediately = true

			try {
				switch (method) {
					case 'eth_chainId':
					case 'eth_getBlockByNumber': {
						// await new Promise(resolve => setTimeout(resolve, 10000000))
						const { client } = useBlockchain()
						result = await client.value.send(method, params)
						break
					}
					case 'wallet_switchEthereumChain': {
						result = await handleWalletSwitchEthereumChain(
							params as WalletSwitchEthereumChainRequest['params'],
						)
						break
					}
					case 'wallet_getCapabilities': {
						// await new Promise(resolve => setTimeout(resolve, 10000000))
						result = (await handleGetCapabilities(
							params as WalletGetCapabilitiesRequest['params'],
						)) as WalletGetCapabilitiesResponse
						break
					}

					// ============== Method that requires user interaction ==============

					case 'wallet_sendCalls':
						validateWalletSendCallsParams(params as WalletSendCallsRequest['params'])
						shouldResolveImmediately = false
						break

					case 'eth_requestAccounts':
					case 'wallet_showCallsStatus': {
						shouldResolveImmediately = false
						break
					}

					default: {
						throw standardErrors.provider.unsupportedMethod(`Method ${method} not supported`)
					}
				}

				if (shouldResolveImmediately) {
					resolve(result)
				}
			} catch (err) {
				// MUST reject with standardErrors; Note that the EthereumProviderError extends EthereumRpcError
				if (err instanceof EthereumRpcError) {
					error.value = err.message
					reject(err)
				} else {
					error.value = getErrorMessage(err)
					reject(standardErrors.rpc.internal(error.value))
				}
			} finally {
				if (shouldResolveImmediately) {
					isLoading.value = false
					pendingRequest.value = null
				}
			}
		})
	}

	return {
		pendingRequest,
		error,
		isLoading,
		method,
		walletRequestHandler,
	}
}
