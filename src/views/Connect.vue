<script setup lang="ts">
import NetworkSelector from '@/components/header/NetworkSelector.vue'
import CenterStageLayout from '@/components/layout/CenterStageLayout.vue'
import { PendingRequest } from '@/features/connect'
import EthRequestAccounts from '@/features/connect/EthRequestAccounts.vue'
import { handleGetCapabilities } from '@/features/connect/wallet_getCapabilities'
import WalletSendCalls from '@/features/connect/WalletSendCalls.vue'
import WalletShowCallsStatus from '@/features/connect/WalletShowCallsStatus.vue'
import { toRoute } from '@/lib/router'
import { useBlockchain } from '@/stores/blockchain'
import {
	SAManagerPopup,
	standardErrors,
	WalletGetCapabilitiesRequest,
	WalletGetCapabilitiesResponse,
	WalletSendCallsRequest,
	WalletShowCallsStatusRequest,
} from '@samanager/sdk'
import { AlertCircle, Loader2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const chainId = route.params.chainId as string

const error = ref<string | null>(null)
const pendingRequest = ref<PendingRequest | null>(null)
const isLoading = ref(false)

const method = computed(() => {
	return pendingRequest.value?.method
})

if (window.opener) {
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
							// await new Promise(resolve => setTimeout(resolve, 10000000))
							const capabilities = (await handleGetCapabilities(
								params as WalletGetCapabilitiesRequest['params'],
							)) as WalletGetCapabilitiesResponse
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
} else {
	// Redirect to the home page when this popup route is not opened by a parent window
	router.replace(toRoute('home'))
}
</script>

<template>
	<CenterStageLayout>
		<EthRequestAccounts
			v-if="method === 'eth_requestAccounts'"
			:pending-request="<PendingRequest<undefined>>pendingRequest"
		/>

		<WalletSendCalls
			v-else-if="method === 'wallet_sendCalls'"
			:pendingRequest="<PendingRequest<WalletSendCallsRequest['params']>>pendingRequest"
		/>

		<WalletShowCallsStatus
			v-else-if="method === 'wallet_showCallsStatus'"
			:pending-request="<PendingRequest<WalletShowCallsStatusRequest['params']>>pendingRequest"
		/>

		<div v-else class="w-full max-w-2xl mx-auto p-6 space-y-6">
			<!-- Header -->
			<div class="flex justify-between items-center mb-6">
				<div class="flex items-center gap-2">
					<h1 class="text-xl font-bold">{{ pendingRequest?.method }}</h1>
				</div>

				<NetworkSelector fixed-chain />
			</div>

			<!-- Loading State -->
			<div v-if="isLoading" class="p-8 text-center space-y-3">
				<Loader2 class="w-8 h-8 animate-spin mx-auto text-primary" />
				<div>
					<h3 class="font-medium">Processing Request...</h3>
				</div>
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
