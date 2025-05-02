<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { displayAccountName } from '@/lib/account'
import { displayChainName } from '@/lib/network'
import { useAccounts } from '@/stores/useAccounts'
import { useNetwork } from '@/stores/useNetwork'
import { shortenAddress } from '@vue-dapp/core'
import { formatEther } from 'ethers'
import { CircleDot, X } from 'lucide-vue-next'
import { Execution } from 'sendop'
import { VueFinalModal } from 'vue-final-modal'
import { TransactionStatus, useTransactionModal } from './useTransactionModal'

const props = withDefaults(
	defineProps<{
		executions?: Execution[]
	}>(),
	{
		executions: () => [],
	},
)

const emit = defineEmits<{
	(e: 'close'): void
}>()

function onClickClose() {
	emit('close')
}

const { selectedChainId } = useNetwork()
const { selectedAccount } = useAccounts()
const {
	userOp,
	status,
	canEstimate,
	canSign,
	canSend,
	selectedPaymaster,
	paymasters,
	availableValidationMethods,
	selectedValidationMethod,
	handleEstimate,
	handleSign,
	handleSend,
} = useTransactionModal()

const error = ref<string | null>(null)

async function onClickEstimate() {
	try {
		error.value = null
		status.value = TransactionStatus.Estimating
		await handleEstimate(props.executions)
		status.value = TransactionStatus.Reviewing
	} catch (e: unknown) {
		console.error(e)
		error.value = e instanceof Error ? e.message : 'Failed to estimate gas'
		status.value = TransactionStatus.Reviewing
	}
}

async function onClickSign() {
	try {
		error.value = null
		status.value = TransactionStatus.Signing
		await handleSign()
		status.value = TransactionStatus.Reviewing
	} catch (e: unknown) {
		console.error(e)
		error.value = e instanceof Error ? e.message : 'Failed to sign transaction'
		status.value = TransactionStatus.Reviewing
	}
}

async function onClickSend() {
	try {
		error.value = null
		status.value = TransactionStatus.Sending
		await handleSend()
	} catch (e: unknown) {
		console.error(e)
		error.value = e instanceof Error ? e.message : 'Failed to send transaction'
		status.value = TransactionStatus.Failed
	}
}
</script>

<template>
	<VueFinalModal
		class="transaction-modal"
		content-class="transaction-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="true"
		:esc-to-close="true"
	>
		<div class="flex flex-col h-full">
			<!-- Header -->
			<div class="flex justify-between items-center">
				<div class="w-9"></div>
				<div class="font-medium">Transaction</div>
				<Button variant="ghost" size="icon" @click="onClickClose">
					<X class="w-4 h-4" />
				</Button>
			</div>

			<!-- Content -->
			<div class="flex-1 mt-2 space-y-6 overflow-y-auto max-h-[420px] py-2">
				<!-- Account Info -->
				<div class="space-y-4">
					<div class="p-4 bg-muted/30 border border-border/50 rounded-lg space-y-3">
						<!-- Account Address -->
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Sender</span>
							<span class="font-mono font-medium">{{
								shortenAddress(selectedAccount?.address || '')
							}}</span>
						</div>

						<!-- Network -->
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Network</span>
							<span class="text-sm">{{ displayChainName(selectedChainId) }}</span>
						</div>

						<!-- Account Type -->
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Account Type</span>
							<span class="text-sm">{{
								selectedAccount?.accountId ? displayAccountName(selectedAccount.accountId) : '-'
							}}</span>
						</div>

						<!-- Deployment Status -->
						<div v-if="selectedAccount?.initCode" class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Status</span>
							<div class="flex items-center gap-2 text-yellow-500">
								<span class="size-2 rounded-full bg-yellow-500"></span>
								<span class="text-sm">Not Deployed</span>
							</div>
						</div>
					</div>

					<!-- Account Deployment Notice -->
					<div
						v-if="selectedAccount?.initCode"
						class="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
					>
						<div class="text-sm text-yellow-500">
							This transaction will also deploy your account contract
						</div>
					</div>
				</div>

				<!-- Transaction Data -->
				<div class="space-y-3">
					<div class="text-sm font-medium">Transaction Data</div>
					<div class="max-h-[200px] overflow-y-auto pr-2 space-y-3">
						<div
							v-for="(execution, index) in executions"
							:key="index"
							class="p-4 bg-muted/30 border border-border/50 rounded-lg space-y-2"
						>
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">To</span>
								<span class="font-mono">{{ shortenAddress(execution.to) }}</span>
							</div>
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Value</span>
								<span>{{ formatEther(execution.value) }} ETH</span>
							</div>
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Data</span>
								<span class="font-mono text-xs truncate max-w-[200px]">{{ execution.data }}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Validation Method -->
				<div class="space-y-3">
					<div class="text-sm font-medium">Validation Method</div>
					<div v-if="availableValidationMethods.length > 1" class="grid gap-3">
						<div
							v-for="method in availableValidationMethods"
							:key="method.type"
							class="border rounded-md p-4 cursor-pointer transition-colors"
							:class="[
								selectedValidationMethod === method.type
									? 'border-primary bg-primary/5'
									: 'hover:bg-accent',
							]"
							@click="selectedValidationMethod = method.type"
						>
							<div class="flex items-center justify-between">
								<div>
									<div class="font-medium">{{ method.type }}</div>
									<div class="text-xs text-muted-foreground mt-1">
										{{ shortenAddress(method.publicKey) }}
									</div>
								</div>
								<div
									class="w-4 h-4 rounded-full border-2"
									:class="[
										selectedValidationMethod === method.type
											? 'border-primary bg-primary'
											: 'border-muted',
									]"
								/>
							</div>
						</div>
					</div>
					<div
						v-else-if="availableValidationMethods.length === 1"
						class="p-4 bg-muted/30 border border-border/50 rounded-lg"
					>
						<div class="flex items-center justify-between">
							<div>
								<div class="font-medium">{{ availableValidationMethods[0].type }}</div>
								<div class="text-xs text-muted-foreground mt-1">
									{{ shortenAddress(availableValidationMethods[0].publicKey) }}
								</div>
							</div>
							<CircleDot class="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>

				<!-- Paymaster Selection -->
				<div class="space-y-3">
					<div class="text-sm font-medium">Gas Payment</div>
					<Select v-model="selectedPaymaster">
						<SelectTrigger
							class="w-full bg-muted/30 border-border/50 hover:border-primary transition-colors"
						>
							<SelectValue placeholder="Select Paymaster">
								<div class="flex items-center justify-between w-full">
									<span class="font-medium">
										{{ paymasters.find(p => p.id === selectedPaymaster)?.name }}
									</span>
								</div>
							</SelectValue>
						</SelectTrigger>

						<!-- z-index: 1100 to make it above the modal(z-index: 1000) -->
						<!-- hover:bg-muted to make it look like a button -->
						<SelectContent class="z-[1100]">
							<SelectItem
								class="cursor-pointer hover:bg-muted"
								v-for="paymaster in paymasters"
								:key="paymaster.id"
								:value="paymaster.id"
							>
								<div class="flex flex-col py-1">
									<div class="flex items-center justify-between w-full">
										<span class="font-medium">{{ paymaster.name }}</span>
									</div>
									<span class="text-xs text-muted-foreground mt-0.5">
										{{ paymaster.description }}
									</span>
								</div>
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<!-- Footer -->
			<div class="mt-2 space-y-3">
				<!-- Error message display -->
				<div v-if="error" class="p-3 bg-destructive/20 text-destructive text-sm rounded-lg">
					{{ error }}
				</div>

				<!-- Status display
				<div v-if="status !== TransactionStatus.Reviewing" class="text-sm text-center mb-2">
					<span v-if="status === TransactionStatus.Signing">Please sign the transaction...</span>
					<span v-if="status === TransactionStatus.Sending">Sending transaction...</span>
					<span v-if="status === TransactionStatus.Pending">Transaction pending...</span>
					<span v-if="status === TransactionStatus.Success" class="text-green-500">
						Transaction successful!
					</span>
					<span v-if="status === TransactionStatus.Failed" class="text-destructive">Transaction failed</span>
				</div> -->

				<!-- Action buttons for each stage -->
				<div class="space-y-2">
					<!-- Estimate Button -->
					<Button
						v-if="
							status === TransactionStatus.Reviewing ||
							status === TransactionStatus.Estimating ||
							status === TransactionStatus.Failed
						"
						class="w-full"
						size="lg"
						:disabled="!canEstimate"
						:loading="status === TransactionStatus.Estimating"
						@click="onClickEstimate"
					>
						{{ status === TransactionStatus.Estimating ? 'Estimating...' : 'Estimate Gas' }}
					</Button>

					<!-- Sign Button -->
					<Button
						v-if="
							userOp &&
							(status === TransactionStatus.Reviewing ||
								status === TransactionStatus.Signing ||
								status === TransactionStatus.Failed)
						"
						class="w-full"
						size="lg"
						:disabled="!canSign"
						:loading="status === TransactionStatus.Signing"
						@click="onClickSign"
					>
						{{ status === TransactionStatus.Signing ? 'Signing...' : 'Sign Transaction' }}
					</Button>

					<!-- Send Button -->
					<Button
						v-if="
							userOp?.signature &&
							(status === TransactionStatus.Reviewing ||
								status === TransactionStatus.Sending ||
								status === TransactionStatus.Pending ||
								status === TransactionStatus.Failed)
						"
						class="w-full"
						size="lg"
						:disabled="!canSend"
						:loading="status === TransactionStatus.Sending || status === TransactionStatus.Pending"
						@click="onClickSend"
					>
						{{ status === TransactionStatus.Sending ? 'Sending...' : 'Send Transaction' }}
					</Button>
				</div>
			</div>
		</div>
	</VueFinalModal>
</template>

<style lang="css">
.transaction-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}

.transaction-modal-content {
	@apply border border-border bg-background p-6 mx-2;
	width: 420px;
	min-height: 390px;
	max-height: 95vh;
	display: flex;
	flex-direction: column;
	border-radius: 0.5rem;
	overflow: hidden;
}

:deep(.select-content) {
	@apply w-[var(--radix-select-trigger-width)];
}
</style>
