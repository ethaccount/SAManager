<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AccountRegistry } from '@/lib/accounts'
import { addressToName } from '@/lib/addressToName'
import { getErrorChainMessage, getErrorMsg, getEthersErrorMsg, isEthersError } from '@/lib/error'
import { useGetCode } from '@/lib/useGetCode'
import { deserializeValidationMethod } from '@/lib/validations'
import { useAccount } from '@/stores/account/useAccount'
import { displayChainName } from '@/stores/blockchain/blockchain'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/useSigner'
import { TransactionStatus, TxModalExecution, useTxModal } from '@/stores/useTxModal'
import { shortenAddress } from '@vue-dapp/core'
import { formatEther, isError } from 'ethers'
import { CircleDot, ExternalLink, Loader2, X } from 'lucide-vue-next'
import {
	ERC4337Error,
	extractHexString,
	isSameAddress,
	parseContractError,
	replaceHexString,
	UserOpBuilder,
} from 'sendop'
import { VueFinalModal } from 'vue-final-modal'
import { toast } from 'vue-sonner'

// If modified, also update defaultProps in useTxModalStore
const props = withDefaults(
	defineProps<{
		executions?: TxModalExecution[]
	}>(),
	{
		executions: () => [],
	},
)

// If modified, also update defaultProps in useTxModalStore
const emit = defineEmits<{
	(e: 'close'): void
	(e: 'executed'): void // when status is success or failed
	(e: 'success'): void
	(e: 'failed'): void
}>()

function onClickClose() {
	// Prevent closing when transaction is being sent or pending
	if (status.value === TransactionStatus.Sending || status.value === TransactionStatus.Pending) {
		return
	}
	emit('close')
}

const { wallet, isConnected } = useEOAWallet()
const { selectedChainId, explorerUrl } = useBlockchain()
const { selectedAccount, selectedAccountInitCodeData, isAccountAccessible } = useAccount()
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
	if (!isAccountAccessible.value) {
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
				throw new Error('Account not deployed and no init code provided')
			}
		})
	}

	// auto click estimate
	await onClickEstimate()
})

onUnmounted(() => {
	useTxModal().reset()
})

const error = ref<string | null>(null)

// Expansion state for executions
const expandedExecutions = ref(new Set<number>())

function toggleExecutionExpansion(index: number) {
	if (expandedExecutions.value.has(index)) {
		expandedExecutions.value.delete(index)
	} else {
		expandedExecutions.value.add(index)
	}
}

function handleError(e: unknown, prefix?: string) {
	console.error(getErrorChainMessage(e, prefix))

	if (e instanceof ERC4337Error) {
		console.log(e.payload)
		if (e.userOp) {
			const op = UserOpBuilder.from(e.userOp, {
				chainId: selectedChainId.value,
			})
			console.log('encoded handleOps data', op.encodeHandleOpsDataWithDefaultGas())
		}
	}

	const msg = getErrorMsg(e, prefix)
	const errHex = extractHexString(msg)
	if (errHex && parseContractError(errHex)) {
		error.value = replaceHexString(msg, parseContractError(errHex, true))
	} else {
		error.value = msg
	}
}

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
		handleError(e, 'Failed to estimate gas')
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
		const prefix = 'Failed to sign user operation'
		console.error(getErrorChainMessage(e, prefix))

		let msg = ''

		if (isEthersError(e)) {
			if (isError(e, 'ACTION_REJECTED')) {
				msg = '' // User rejected the operation on browser wallet. Don't show error message
			} else {
				const errorMsg = getEthersErrorMsg(e, prefix)
				// Check for chain ID mismatch error
				const chainMismatchMatch = errorMsg.match(
					/Provided chainId "(\d+)" must match the active chainId "(\d+)"/,
				)
				if (chainMismatchMatch) {
					const expectedChainId = chainMismatchMatch[1]
					const currentChainName = displayChainName(Number(expectedChainId))
					msg = `Please switch your wallet to ${currentChainName} to sign the user operation`
				} else {
					msg = errorMsg
				}
			}
		} else if (e instanceof Error && e.message.includes('The operation either timed out or was not allowed')) {
			msg = '' // User rejected the operation on passkey. Don't show error message
		} else {
			msg = getErrorMsg(e, prefix)
		}

		error.value = msg
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
		handleError(e, 'Failed to send user operation')
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
	const op = userOp.value
	const sender = op.preview().sender
	const foundLog = opReceipt.value.logs.find(log => isSameAddress(log.address, sender))
	if (!foundLog) {
		return `${explorerUrl.value}/tx/${opReceipt.value.receipt.transactionHash}`
	}
	return `${explorerUrl.value}/tx/${foundLog.transactionHash}`
})

const showEOAWalletValidationMethod = computed(() => {
	if (!selectedAccount.value) return false
	if (!isConnected.value) return false
	return selectedAccount.value.vMethods.some(v => deserializeValidationMethod(v).signerType === 'EOAWallet')
})

const showPasskeyValidationMethod = computed(() => {
	if (!selectedAccount.value) return false
	if (!isLogin.value) return false
	return selectedAccount.value.vMethods.some(v => deserializeValidationMethod(v).signerType === 'Passkey')
})

// Computed property to determine if modal can be closed
const canClose = computed(() => {
	return status.value !== TransactionStatus.Sending && status.value !== TransactionStatus.Pending
})

const entryPointAddress = computed(() => {
	if (!userOp.value) return null
	return userOp.value.entryPointAddress
})
</script>

<template>
	<VueFinalModal
		class="transaction-modal"
		content-class="transaction-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="canClose"
		:esc-to-close="canClose"
	>
		<div class="flex flex-col h-full">
			<!-- Header -->
			<div class="flex justify-between items-center">
				<div class="w-9"></div>
				<div class="font-medium">Transaction</div>
				<Button variant="ghost" size="icon" :disabled="!canClose" @click="onClickClose">
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
							class="flex flex-col p-2.5 border rounded-lg transition-all"
							:class="{
								'cursor-pointer': status === TransactionStatus.Estimation,
								'opacity-50 cursor-not-allowed': status !== TransactionStatus.Estimation,
							}"
							@click="status === TransactionStatus.Estimation && selectSigner('EOAWallet')"
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
							:class="{
								'cursor-pointer': status === TransactionStatus.Estimation,
								'opacity-50 cursor-not-allowed': status !== TransactionStatus.Estimation,
							}"
							@click="status === TransactionStatus.Estimation && selectSigner('Passkey')"
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
								selectedAccount?.accountId ? AccountRegistry.getName(selectedAccount.accountId) : '-'
							}}</span>
						</div>

						<!-- Entry Point Version -->
						<div v-if="entryPointAddress" class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">EntryPoint</span>
							<span class="text-sm">{{ addressToName(entryPointAddress) }}</span>
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
							class="border border-border/50 rounded-lg"
						>
							<!-- Execution Header -->
							<div
								class="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
								@click="toggleExecutionExpansion(index)"
							>
								<div class="text-sm">
									{{ execution.description || 'Unknown' }}
								</div>
							</div>

							<!-- Execution Details -->
							<div v-if="expandedExecutions.has(index)" class="border-t bg-muted/20">
								<div class="p-4 space-y-2">
									<!-- To -->
									<div class="flex items-center justify-between text-sm">
										<div class="text-muted-foreground">To</div>
										<div class="flex gap-2 items-center">
											<div class="font-mono text-xs">{{ shortenAddress(execution.to) }}</div>
											<CopyButton :address="execution.to" />
										</div>
									</div>

									<!-- Value -->
									<div class="flex items-center justify-between text-sm">
										<div class="text-muted-foreground">Value</div>
										<div class="text-xs">{{ formatEther(execution.value) }} ETH</div>
									</div>

									<!-- Data -->
									<div class="flex flex-col text-sm">
										<div class="text-muted-foreground">Data</div>
										<div class="font-mono text-xs break-all">{{ execution.data }}</div>
									</div>
								</div>
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
								status === TransactionStatus.Send ||
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
