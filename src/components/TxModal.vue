<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getErrMsg } from '@/lib/error'
import { useGetCode } from '@/lib/useGetCode'
import { displayAccountName } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { displayChainName } from '@/stores/blockchain/blockchain'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { TransactionStatus, useTxModal } from '@/stores/useTxModal'
import { useSigner } from '@/stores/validation/useSigner'
import { shortenAddress } from '@vue-dapp/core'
import { formatEther } from 'ethers'
import { CircleDot, ExternalLink, Loader2, X } from 'lucide-vue-next'
import { Execution, isSameAddress } from 'sendop'
import { VueFinalModal } from 'vue-final-modal'
import { toast } from 'vue-sonner'

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
	(e: 'executed'): void // when status is success or failed
	(e: 'success'): void
	(e: 'failed'): void
}>()

function onClickClose() {
	emit('close')
}

const { wallet, isConnected } = useEOAWallet()
const { selectedChainId, explorerUrl, selectedEntryPoint } = useBlockchain()
const { selectedAccount, selectedAccountInitCodeData, isAccountConnected } = useAccount()
const { selectSigner, selectedSigner } = useSigner()
const { selectedCredentialDisplay, isLogin } = usePasskey()

const {
	userOp,
	opReceipt,
	status,
	canEstimate,
	canSign,
	canSend,
	selectedPaymaster,
	paymasters,
	handleEstimate,
	handleSign,
	handleSend,
} = useTxModal()

const { isDeployed, getCode, loading: isLoadingCode } = useGetCode()

onMounted(async () => {
	// Check if account is connected
	if (!isAccountConnected.value) {
		emit('close')
		toast.error('Account not connected')
		return
	}

	// Check if account is deployed
	if (selectedAccount.value?.address && selectedAccount.value.category === 'Smart Account') {
		await getCode(selectedAccount.value.address)

		nextTick(() => {
			if (!isDeployed.value && !selectedAccountInitCodeData.value) {
				emit('close')
				toast.error('Account not deployed and no init code provided')
				return
			}
		})
	}
})

onUnmounted(() => {
	useTxModal().reset()
})

const error = ref<string | null>(null)

async function onClickEstimate() {
	try {
		error.value = null
		status.value = TransactionStatus.Estimating

		if (!selectedAccount.value) {
			throw new Error('No account selected')
		}

		if (isDeployed.value || selectedAccount.value.category === 'Smart EOA') {
			await handleEstimate(props.executions)
		} else {
			// If the account is not deployed, check if there is init code provided
			if (!selectedAccountInitCodeData.value) {
				emit('close')
				toast.error('Account not deployed and no init code provided')
				return
			}
			await handleEstimate(props.executions, selectedAccountInitCodeData.value.initCode)
		}
		status.value = TransactionStatus.Sign
	} catch (e: unknown) {
		console.error(e)
		error.value = getErrMsg(e, 'Failed to estimate gas')
		status.value = TransactionStatus.Estimation
	}
}

async function onClickSign() {
	try {
		error.value = null
		status.value = TransactionStatus.Signing
		await handleSign()
		status.value = TransactionStatus.Send
	} catch (e: unknown) {
		console.error(e)
		error.value = getErrMsg(e, 'Failed to sign transaction')
		status.value = TransactionStatus.Sign
	}
}

async function onClickSend() {
	try {
		error.value = null
		status.value = TransactionStatus.Sending

		await handleSend()

		emit('executed')

		nextTick(() => {
			if (status.value === TransactionStatus.Success) {
				emit('success')
			} else if (status.value === TransactionStatus.Failed) {
				emit('failed')
			}
		})
	} catch (e: unknown) {
		console.error(e)
		error.value = getErrMsg(e, 'Failed to send transaction')
		status.value = TransactionStatus.Estimation
	}
}

// Auto send when signing is done
watch(status, (newStatus, oldStatus) => {
	if (oldStatus === TransactionStatus.Signing && newStatus === TransactionStatus.Send) {
		onClickSend()
	}
})

/**
 * If the sender's tx hash is not found in the receipt logs, use the entire bundle's tx hash.
 * Otherwise, use the sender related log's tx hash.
 */
const txLink = computed(() => {
	if (!userOp.value || !opReceipt.value) return null
	const sender = userOp.value.sender
	const foundLog = opReceipt.value.logs.find(log => isSameAddress(log.address, sender))
	if (!foundLog) {
		return `${explorerUrl.value}/tx/${opReceipt.value.receipt.transactionHash}`
	}
	return `${explorerUrl.value}/tx/${foundLog.transactionHash}`
})

const showEOAWalletValidationMethod = computed(() => {
	if (!selectedAccount.value) return false
	if (!isConnected.value) return false
	return selectedAccount.value.vOptions.some(v => v.type === 'EOA-Owned' || v.type === 'SmartEOA')
})

const showPasskeyValidationMethod = computed(() => {
	if (!selectedAccount.value) return false
	if (!isLogin.value) return false
	return selectedAccount.value.vOptions.some(v => v.type === 'Passkey')
})
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
				<!-- Paymaster Selection -->
				<div class="space-y-3">
					<div class="text-sm font-medium">Select Paymaster</div>
					<Select v-model="selectedPaymaster" :disabled="status !== TransactionStatus.Estimation">
						<SelectTrigger
							class="w-full bg-muted/30 border-border/50 hover:border-primary transition-colors"
							:class="{ 'opacity-50 cursor-not-allowed': status !== TransactionStatus.Estimation }"
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

				<!-- Validation Method -->
				<div class="space-y-3">
					<div class="text-sm font-medium">Validation Method</div>
					<div class="space-y-2">
						<!-- EOA-Owned or SmartEOA -->
						<div
							v-if="showEOAWalletValidationMethod"
							class="flex flex-col p-2.5 border rounded-lg transition-all cursor-pointer"
							@click="selectSigner('EOAWallet')"
						>
							<div class="space-y-1">
								<div class="flex justify-between items-center">
									<div class="flex items-center gap-1.5 text-xs">
										<CircleDot
											class="w-2.5 h-2.5"
											:class="
												selectedSigner?.type === 'EOAWallet'
													? 'text-green-500'
													: 'text-muted-foreground'
											"
										/>
										<span>{{ wallet.providerInfo?.name }} Connected</span>
									</div>
								</div>
								<div class="text-xs text-muted-foreground font-mono">
									{{ wallet.address ? shortenAddress(wallet.address) : '-' }}
								</div>
							</div>
						</div>

						<!-- Passkey -->
						<div
							v-if="showPasskeyValidationMethod"
							class="flex flex-col p-2.5 border rounded-lg transition-all"
							:class="{ 'cursor-pointer': selectedSigner?.type !== 'Passkey' }"
							@click="selectSigner('Passkey')"
						>
							<div class="space-y-1">
								<div class="flex justify-between items-center">
									<div class="flex items-center gap-1.5 text-xs">
										<CircleDot
											class="w-2.5 h-2.5"
											:class="
												selectedSigner?.type === 'Passkey'
													? 'text-green-500'
													: 'text-muted-foreground'
											"
										/>
										<span>Passkey Connected</span>
									</div>
								</div>
								<div class="text-xs text-muted-foreground">
									{{ selectedCredentialDisplay }}
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Account Info -->
				<div class="space-y-4">
					<div class="p-4 bg-muted/30 border border-border/50 rounded-lg space-y-3">
						<!-- Account Address -->
						<div class="flex items-center justify-between text-sm">
							<div class="text-muted-foreground">Sender</div>
							<div class="flex gap-2">
								<div class="font-mono font-medium">
									{{ shortenAddress(selectedAccount?.address || '') }}
								</div>
								<CopyButton :address="selectedAccount?.address || ''" />
							</div>
						</div>

						<!-- Network -->
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Network</span>
							<div class="flex items-center gap-2">
								<ChainIcon :chain-id="selectedChainId" :size="24" :show-tooltip="false" />
								<span class="text-sm">{{ displayChainName(selectedChainId) }}</span>
							</div>
						</div>

						<!-- Account Type -->
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Account Type</span>
							<span class="text-sm">{{
								selectedAccount?.accountId ? displayAccountName(selectedAccount.accountId) : '-'
							}}</span>
						</div>

						<!-- Entry Point Version -->
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">EntryPoint Version</span>
							<span class="text-sm">{{ selectedEntryPoint }}</span>
						</div>

						<!-- Deployment Status -->
						<div
							v-if="!isDeployed && selectedAccount?.category === 'Smart Account'"
							class="flex items-center justify-between text-sm"
						>
							<span class="text-muted-foreground">Status</span>
							<div class="flex items-center gap-2 text-yellow-500">
								<span class="size-2 rounded-full bg-yellow-500"></span>
								<span class="text-sm">Not Deployed</span>
							</div>
						</div>
					</div>

					<!-- Account Deployment Notice -->
					<div v-if="!isDeployed && selectedAccount?.category === 'Smart Account'" class="warning-section">
						This transaction will deploy your account
					</div>
				</div>

				<!-- Executions -->
				<div v-if="executions.length > 0" class="space-y-3">
					<div class="text-sm font-medium">Executions</div>
					<div class="space-y-3">
						<div
							v-for="(execution, index) in executions"
							:key="index"
							class="p-4 bg-muted/30 border border-border/50 rounded-lg space-y-2"
						>
							<div class="flex items-center justify-between text-sm">
								<div class="text-muted-foreground">To</div>
								<div class="flex gap-2">
									<div class="font-mono">{{ shortenAddress(execution.to) }}</div>
									<CopyButton :address="execution.to" />
								</div>
							</div>
							<div class="flex items-center justify-between text-sm">
								<div class="text-muted-foreground">Value</div>
								<div>{{ formatEther(execution.value) }} ETH</div>
							</div>
							<div class="flex flex-col text-sm">
								<div class="text-muted-foreground">Data</div>
								<div class="font-mono text-xs break-all">{{ execution.data }}</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="mt-5 space-y-3">
				<!-- Error message display -->
				<div v-if="error" class="error-section max-h-[100px] overflow-y-auto">
					{{ error }}
				</div>

				<!-- Transaction Status Display -->
				<div
					v-if="status === TransactionStatus.Success || status === TransactionStatus.Failed"
					class="rounded-lg text-center space-y-2"
				>
					<template v-if="status === TransactionStatus.Success">
						<div class="flex flex-col items-center justify-center">
							<h3 class="text-xl font-semibold text-emerald-500 mb-2">Transaction Successful!</h3>
							<a
								v-if="txLink"
								:href="txLink"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
							>
								View on Explorer
								<ExternalLink class="w-4 h-4" />
							</a>
						</div>
					</template>

					<template v-if="status === TransactionStatus.Failed">
						<div class="flex flex-col items-center justify-center">
							<h3 class="text-xl font-semibold text-destructive">Transaction Failed</h3>
							<a
								v-if="txLink"
								:href="txLink"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
							>
								View on Explorer
								<ExternalLink class="w-4 h-4" />
							</a>
							<p v-if="error" class="mt-2 text-sm text-muted-foreground">
								{{ error }}
							</p>
						</div>
					</template>
				</div>

				<!-- ============================ Action buttons ============================ -->
				<div class="space-y-2">
					<div v-if="isLoadingCode" class="flex justify-center py-4">
						<Loader2 class="w-6 h-6 animate-spin text-primary" />
					</div>

					<div v-else>
						<!-- Estimate Button -->
						<Button
							v-if="status === TransactionStatus.Estimation || status === TransactionStatus.Estimating"
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
							v-if="(userOp && status === TransactionStatus.Sign) || status === TransactionStatus.Signing"
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
								(userOp?.signature && status === TransactionStatus.Send) ||
								status === TransactionStatus.Sending ||
								status === TransactionStatus.Pending
							"
							class="w-full"
							size="lg"
							:disabled="!canSend"
							:loading="status === TransactionStatus.Sending || status === TransactionStatus.Pending"
							@click="onClickSend"
						>
							{{
								status === TransactionStatus.Sending
									? 'Sending...'
									: status === TransactionStatus.Pending
									? 'Pending...'
									: 'Send Transaction'
							}}
						</Button>
					</div>
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

@keyframes scale {
	0% {
		transform: scale(0.8);
		opacity: 0;
	}
	100% {
		transform: scale(1);
		opacity: 1;
	}
}

@keyframes dash {
	to {
		stroke-dashoffset: 0;
	}
}
</style>
