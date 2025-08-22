<script setup lang="ts">
import NetworkSelector from '@/components/header/NetworkSelector.vue'
import CenterStageLayout from '@/components/layout/CenterStageLayout.vue'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain'
import { SAManagerPopup, standardErrors, WalletGetCapabilitiesRequest } from '@samanager/sdk'
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import EthRequestAccounts from './EthRequestAccounts.vue'
import { handleGetCapabilities } from './handleGetCapabilities'

const { selectedAccount } = useAccount()

type PendingRequest = {
	method: string
	params: unknown[]
	resolve: (value: unknown) => void
	reject: (reason?: unknown) => void
}

const error = ref<string | null>(null)
const pendingRequest = ref<PendingRequest | null>(null)
const isLoading = ref(false)

const route = useRoute()
const chainId = route.params.chainId as string

if (!chainId) {
	window.close()
}

new SAManagerPopup({
	debug: true,
	chainId: BigInt(chainId),
	walletRequestHandler: async (method, params) => {
		console.log('request', method, params)

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
					case 'wallet_getCapabilities': {
						const capabilities = handleGetCapabilities(params as WalletGetCapabilitiesRequest['params'])
						result = capabilities
						break
					}
					// Method that requires user interaction
					case 'eth_requestAccounts':
					case 'wallet_sendCalls':
					case 'wallet_showCallsStatus': {
						shouldResolveImmediately = false
						break
					}

					default: {
						throw standardErrors.provider.unsupportedMethod({
							message: `Method ${method} not supported`,
						})
					}
				}

				if (shouldResolveImmediately) {
					resolve(result)
				}
				// For eth_requestAccounts, the promise remains pending until user clicks connect
			} catch (err) {
				console.error('Error processing request', err)
				error.value = err instanceof Error ? err.message : 'Failed to process request'
				reject(standardErrors.rpc.internal(error.value))
			} finally {
				if (shouldResolveImmediately) {
					isLoading.value = false
					pendingRequest.value = null
				}
			}
		})
	},
})

function onClickConnect() {
	try {
		if (!pendingRequest.value) {
			throw new Error('No pending request')
		}
		console.log('onClickConnect')
		if (!selectedAccount.value) {
			throw standardErrors.provider.userRejectedRequest()
		} else {
			pendingRequest.value.resolve([selectedAccount.value.address])
		}
	} catch (err) {
		pendingRequest.value?.reject(
			standardErrors.rpc.internal(err instanceof Error ? err.message : 'Failed to connect'),
		)
	} finally {
		isLoading.value = false
		pendingRequest.value = null
	}
}

function onClickReject() {
	try {
		if (!pendingRequest.value) {
			throw new Error('No pending request')
		}
		console.log('onClickReject')
		pendingRequest.value.reject(standardErrors.provider.userRejectedRequest())
	} catch (err) {
		console.error('Error rejecting request:', err)
	} finally {
		isLoading.value = false
		pendingRequest.value = null
	}
}
</script>

<template>
	<CenterStageLayout>
		<!-- eth_requestAccounts -->
		<EthRequestAccounts
			v-if="pendingRequest?.method === 'eth_requestAccounts'"
			@connect="onClickConnect"
			@reject="onClickReject"
		/>
		<!-- other requests -->
		<div v-else class="w-full max-w-2xl mx-auto p-6 space-y-6">
			<!-- Header -->
			<div class="flex justify-between items-center mb-6">
				<div class="flex items-center gap-2">
					<h1 class="text-xl font-bold">Processing Request</h1>
					<Loader2 v-if="isLoading" class="w-5 h-5 animate-spin text-primary" />
				</div>

				<NetworkSelector fixed-chain />
			</div>

			<!-- Request Details -->
			<div class="space-y-4">
				<div class="p-4 border rounded-lg bg-accent/5">
					<div class="space-y-3 text-sm">
						<div>
							<span class="font-medium text-muted-foreground">Method:</span>
							<div class="mt-1 p-2 bg-background rounded border font-mono text-sm">
								{{ pendingRequest?.method }}
							</div>
						</div>

						<div>
							<span class="font-medium text-muted-foreground">Parameters:</span>
							<div
								class="mt-1 p-2 bg-background rounded border font-mono text-sm max-h-32 overflow-y-auto"
							>
								<pre>{{ JSON.stringify(pendingRequest?.params, null, 2) }}</pre>
							</div>
						</div>
					</div>
				</div>

				<!-- Error Display -->
				<div
					v-if="error"
					class="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800"
				>
					<div class="flex items-center gap-2 mb-2">
						<AlertCircle class="w-5 h-5 text-red-500" />
						<h3 class="font-semibold text-red-700 dark:text-red-300">Error</h3>
					</div>
					<div class="text-red-600 dark:text-red-400 text-sm font-mono">
						{{ error }}
					</div>
				</div>
			</div>
		</div>
	</CenterStageLayout>
</template>

<style lang="css" scoped></style>
