<script setup lang="ts">
import { getErrorMessage } from '@/lib/error'
import { useBlockchain } from '@/stores/blockchain'
import { CallIdentifier, CallIdentifierType, decodeCallIdentifier, WalletShowCallsStatusRequest } from '@samanager/sdk'
import { AlertCircle, CheckCircle, ExternalLink, Loader2 } from 'lucide-vue-next'
import { PendingRequest } from './types'

const props = defineProps<{
	pendingRequest: PendingRequest<WalletShowCallsStatusRequest['params']>
}>()

const identifier = computed(() => {
	return props.pendingRequest.params[0]
})

const decodedIdentifier = computed<CallIdentifier | null>(() => {
	try {
		return decodeCallIdentifier(identifier.value)
	} catch (e) {
		console.error('Error decoding identifier:', getErrorMessage(e))
		return null
	}
})

const { client, bundler, explorerUrl } = useBlockchain()

const isLoading = ref(true)
const error = ref<string | null>(null)
const receipt = ref<{
	transactionHash?: string
	receipt?: { transactionHash?: string }
	success?: boolean
} | null>(null)

const txLink = computed(() => {
	if (!receipt.value) return null
	return `${explorerUrl.value}/tx/${receipt.value.receipt?.transactionHash || receipt.value.transactionHash}`
})

const isSuccess = computed(() => {
	return receipt.value && receipt.value.success !== false
})

onMounted(async () => {
	try {
		isLoading.value = true
		error.value = null

		if (!decodedIdentifier.value) {
			throw new Error('Invalid identifier')
		}

		if (decodedIdentifier.value.type === CallIdentifierType.tx) {
			const result = await client.value.getTransactionReceipt(decodedIdentifier.value.hash)
			if (result) {
				receipt.value = result.toJSON()
			} else {
				throw new Error('Transaction receipt not found')
			}
		} else if (decodedIdentifier.value.type === CallIdentifierType.op) {
			receipt.value = await bundler.value.waitForReceipt(decodedIdentifier.value.hash)
		} else {
			throw new Error('Invalid identifier type')
		}
	} catch (e: unknown) {
		console.error('Error getting call status:', e)
		error.value = `Error getting call status: ${getErrorMessage(e)}`
	} finally {
		isLoading.value = false
	}
})

function onClickClose() {
	props.pendingRequest.resolve(undefined)
}
</script>

<template>
	<div class="w-full max-w-2xl mx-auto p-6 space-y-6">
		<!-- Header -->
		<div class="flex justify-between items-center mb-6">
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold">Call Status</h1>
			</div>

			<div class="flex items-center gap-3">
				<NetworkSelector fixed-chain />
			</div>
		</div>

		<!-- Loading State -->
		<div v-if="isLoading" class="p-8 text-center space-y-3">
			<Loader2 class="w-8 h-8 animate-spin mx-auto text-primary" />
			<div>
				<h3 class="font-medium">Checking Call Status...</h3>
			</div>
		</div>

		<!-- Error State -->
		<div
			v-else-if="error"
			class="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800"
		>
			<div class="flex items-center gap-2 mb-2">
				<AlertCircle class="w-5 h-5 text-red-500" />
				<h3 class="font-semibold text-red-700 dark:text-red-300">Error</h3>
			</div>
			<div class="text-red-600 dark:text-red-400 text-sm">
				{{ error }}
			</div>
		</div>

		<!-- Success/Failure State -->
		<div v-else-if="receipt" class="space-y-4">
			<!-- Status Display -->
			<div class="rounded-lg text-center space-y-4 p-6 border bg-accent/5">
				<div v-if="isSuccess" class="flex flex-col items-center justify-center space-y-2">
					<CheckCircle class="w-12 h-12 text-emerald-500" />
					<h3 class="text-xl font-semibold text-emerald-500">Call Successful!</h3>
				</div>

				<div v-else class="flex flex-col items-center justify-center space-y-2">
					<AlertCircle class="w-12 h-12 text-destructive" />
					<h3 class="text-xl font-semibold text-destructive">Call Failed</h3>
					<p class="text-sm text-muted-foreground">Your transaction was not successful</p>
				</div>

				<!-- Explorer Link -->
				<a
					v-if="txLink"
					:href="txLink"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
				>
					View on Explorer
					<ExternalLink class="w-4 h-4" />
				</a>
			</div>

			<!-- Call Details -->
			<!-- <div class="p-4 border rounded-lg bg-accent/5">
				<div class="space-y-3 text-sm">
					<div>
						<span class="font-medium text-muted-foreground">Call Identifier:</span>
						<div class="mt-1 p-2 bg-background rounded border font-mono text-sm break-all">
							{{ identifier }}
						</div>
					</div>

					<div v-if="receipt.transactionHash || receipt.receipt?.transactionHash">
						<span class="font-medium text-muted-foreground">Transaction Hash:</span>
						<div class="mt-1 p-2 bg-background rounded border font-mono text-sm break-all">
							{{ receipt.transactionHash || receipt.receipt?.transactionHash }}
						</div>
					</div>
				</div>
			</div> -->
		</div>

		<!-- Close Button -->
		<div class="flex justify-center">
			<Button @click="onClickClose"> Close </Button>
		</div>
	</div>
</template>

<style lang="css" scoped></style>
