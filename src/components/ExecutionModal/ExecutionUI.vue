<script setup lang="ts">
import { fetchEthUsdPrice } from '@/api/etherscan'
import { ExecutionUIEmits, ExecutionUIProps, TransactionStatus, useExecutionModal } from '@/components/ExecutionModal'
import NetworkSelector from '@/components/header/NetworkSelector.vue'
import { ERROR_NOTIFICATION_DURATION } from '@/config'
import { AccountRegistry } from '@/lib/accounts'
import { addressToName } from '@/lib/addressToName'
import {
	getChainMismatchErrorMessage,
	getErrorChainMessage,
	getErrorMessage,
	isChainMismatchError,
	isUserRejectedError,
} from '@/lib/error'
import { useGetCode } from '@/lib/useGetCode'
import { deserializeValidationMethod } from '@/lib/validations'
import { useAccount } from '@/stores/account/useAccount'
import { getEntryPointAddress } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/useSigner'
import { formatEther } from 'ethers'
import { ArrowLeft, CircleDot, Code, ExternalLink, Info, Loader2, X } from 'lucide-vue-next'
import {
	ERC4337Error,
	extractHexString,
	isSameAddress,
	parseContractError,
	replaceHexString,
	UserOpBuilder,
} from 'sendop'
import { toast } from 'vue-sonner'
import { usePaymaster } from './paymasters'
import { usePaymasterService } from './paymasters/usePaymasterService'

const props = withDefaults(defineProps<ExecutionUIProps>(), {
	executions: () => [],
	useModalSpecificStyle: true,
})

const emit = defineEmits<ExecutionUIEmits>()

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
const { isLoading: isLoadingPaymaster } = usePaymaster()
const { isDeployed, getCode, loading: isLoadingCode } = useGetCode()
const { currentEntryPointAddress, setEntryPointAddress } = useBlockchain()
const {
	userOp,
	opReceipt,
	status,
	canEstimate,
	canSign,
	canSend,
	canClose,
	handleEstimate,
	handleSign,
	sendUserOp,
	waitUserOp,
	resetExecutionModal,
} = useExecutionModal()

status.value = TransactionStatus.Initial

const executionError = ref<string | null>(null)

// Expansion state for executions
const expandedExecutions = ref(new Set<number>())

// Auto-expand executions with unknown descriptions
watchImmediate(
	() => props.executions,
	executions => {
		executions.forEach((execution, index) => {
			if (!execution.description || execution.description === 'Unknown') {
				expandedExecutions.value.add(index)
			}
		})
	},
)

// UserOp preview state
const showUserOpPreview = ref(false)

const ethUsdPrice = ref<number | null>(null)

async function updateEthUsdPrice() {
	ethUsdPrice.value = await fetchEthUsdPrice()
}

// Close the ExecutionModal when the account is not accessible
watchImmediate(isAccountAccessible, () => {
	if (!isAccountAccessible.value) {
		toast.error('Account is not accessible. Please connect the right signer to the account')
		emit('close')
	}
})

const { selectedPaymaster, paymasters, checkUsdcBalanceAndAllowance, usdcPaymasterData } = usePaymaster()

// ================================================
// Paymaster Selection Logic
// ================================================

if (props.paymasterCapability) {
	selectedPaymaster.value = 'erc7677'
} else if (!paymasters.value.some(paymaster => paymaster.id === selectedPaymaster.value)) {
	// If the selected paymaster is not supported, switch to the first supported paymaster
	selectedPaymaster.value = paymasters.value[0].id
}

// This cannot be placed in useExecutionModal because it needs to be executed immediately when the ExecutionModal is mounted
watchImmediate(selectedPaymaster, async () => {
	if (status.value === TransactionStatus.Initial) {
		try {
			isLoadingPaymaster.value = true

			if (selectedPaymaster.value === 'usdc') {
				// Preparing USDC paymaster
				status.value = TransactionStatus.PreparingPaymaster

				await checkUsdcBalanceAndAllowance()
				if (usdcPaymasterData.value) {
					status.value = TransactionStatus.Initial
				}
			} else if (selectedPaymaster.value === 'erc7677') {
				// Preparing ERC-7677 paymaster
				status.value = TransactionStatus.PreparingPaymaster
				const { checkEntryPointSupport } = usePaymasterService()
				const isEntryPointSupported = await checkEntryPointSupport(props.paymasterCapability)
				if (isEntryPointSupported) {
					status.value = TransactionStatus.Initial
				} else {
					throw new Error('Paymaster service does not support the current entrypoint')
				}
			}
		} catch (e) {
			handleError(e, 'Error preparing paymaster')
			status.value = TransactionStatus.Initial
		} finally {
			isLoadingPaymaster.value = false
		}
	}
})

// When the ExecutionModal is opened
onMounted(async () => {
	if (!selectedAccount.value) {
		throw new Error('[ExecutionModal#onMounted] No account selected')
	}

	// Check if account is deployed
	if (selectedAccount.value.address && selectedAccount.value.category === 'Smart Account') {
		await getCode(selectedAccount.value.address)

		nextTick(() => {
			if (!isDeployed.value && !selectedAccountInitCodeData.value) {
				emit('close')
				throw new Error('Account not deployed and no init code provided')
			}
		})
	}

	// Set entrypoint address to the blockchain store
	const entryPointVersion = AccountRegistry.getEntryPointVersion(selectedAccount.value.accountId)
	const entryPointAddress = getEntryPointAddress(entryPointVersion)
	setEntryPointAddress(entryPointAddress)
})

onUnmounted(() => {
	resetExecutionModal()
})

watchImmediate(status, (newStatus, oldStatus) => {
	// Auto send when signing is done
	if (oldStatus === TransactionStatus.Signing && newStatus === TransactionStatus.Send) {
		onClickSend()
	}
})

function toggleExecutionExpansion(index: number) {
	if (expandedExecutions.value.has(index)) {
		expandedExecutions.value.delete(index)
	} else {
		expandedExecutions.value.add(index)
	}
}

function toggleUserOpPreview() {
	showUserOpPreview.value = !showUserOpPreview.value
}

function handleError(e: unknown, prefix?: string) {
	console.error(prefix, e)

	const msg = getErrorMessage(e, prefix)

	if (e instanceof ERC4337Error) {
		console.log(e.payload)
		if (e.userOp) {
			const op = UserOpBuilder.from(e.userOp, {
				chainId: selectedChainId.value,
			})
			console.log('encoded handleOps data', op.encodeHandleOpsDataWithDefaultGas())
		}
	}

	const errHex = extractHexString(msg)
	if (errHex && parseContractError(errHex)) {
		executionError.value = replaceHexString(msg, parseContractError(errHex, true))
	} else {
		executionError.value = msg
	}

	toast.error(executionError.value, {
		duration: ERROR_NOTIFICATION_DURATION,
	})
}

async function onClickEstimate() {
	try {
		executionError.value = null
		status.value = TransactionStatus.Estimating

		if (!selectedAccount.value) {
			throw new Error('No account selected')
		}

		if (isDeployed.value || selectedAccount.value.category === 'Smart EOA') {
			await handleEstimate({ executions: props.executions, paymasterCapability: props.paymasterCapability })
		} else {
			// If the account is not deployed, check if there is init code provided
			if (!selectedAccountInitCodeData.value) {
				throw new Error('Account not deployed and no init code provided')
			}
			await handleEstimate({
				executions: props.executions,
				initCode: selectedAccountInitCodeData.value.initCode,
				paymasterCapability: props.paymasterCapability,
			})
		}
		status.value = TransactionStatus.Sign
	} catch (e) {
		handleError(e, 'Error estimating gas')
		status.value = TransactionStatus.Initial
	} finally {
		await updateEthUsdPrice()
	}
}

async function onClickSign() {
	try {
		executionError.value = null
		status.value = TransactionStatus.Signing
		await handleSign()
		status.value = TransactionStatus.Send
	} catch (e: unknown) {
		const prefix = 'Failed to sign user operation'
		console.error(getErrorChainMessage(e, prefix))

		let msg = getErrorMessage(e, prefix)

		// Chain mismatch error - show user-friendly message
		if (isChainMismatchError(e)) {
			msg = getChainMismatchErrorMessage(e)
		}

		// User rejected signing on browser wallet or passkey. Don't show error message
		if (isUserRejectedError(e)) {
			msg = ''
		}

		executionError.value = msg
		status.value = TransactionStatus.Sign
	}
}

async function onClickSend() {
	try {
		if (!userOp.value) {
			throw new Error('[waitUserOp] User operation not built')
		}
		const op = userOp.value

		executionError.value = null

		await sendUserOp()
		emit('sent', op.hash())

		await waitUserOp()

		emit('executed')

		nextTick(() => {
			if (status.value === TransactionStatus.Success) {
				emit('success')
			} else if (status.value === TransactionStatus.Failed) {
				emit('failed')
			}
		})
	} catch (e: unknown) {
		handleError(e, 'Error sending user operation')
		status.value = TransactionStatus.Initial
	} finally {
		await updateEthUsdPrice()
	}
}

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

/**
 * Regardless of the currently selected signer,
 * return true if the user is able to select EOAWallet and can immediately connect to that Account.
 */
const showEOAWalletValidationMethod = computed(() => {
	if (!selectedAccount.value) return false
	if (!isConnected.value) return false

	const { connectedSigners } = useSigner()

	return selectedAccount.value.vMethods.some(v => {
		if (!connectedSigners.value) return false
		const vMethod = deserializeValidationMethod(v)
		return (
			vMethod.signerType === 'EOAWallet' &&
			vMethod.isValidSignerIdentifier(connectedSigners.value.EOAWallet.identifier ?? '')
		)
	})
})

const showPasskeyValidationMethod = computed(() => {
	if (!selectedAccount.value) return false
	if (!isLogin.value) return false
	return selectedAccount.value.vMethods.some(v => deserializeValidationMethod(v).signerType === 'Passkey')
})

// Computed properties for signer selection
const canSelectSigner = computed(() => {
	return status.value === TransactionStatus.Initial || status.value === TransactionStatus.PreparingPaymaster
})

const signerSelectorDisabled = computed(() => {
	return !canSelectSigner.value
})

// Show max fee when userOp exists and transaction is estimated or completed
const shouldShowMaxFee = computed(() => {
	return (
		userOp.value &&
		status.value !== TransactionStatus.Initial &&
		status.value !== TransactionStatus.Estimating &&
		status.value !== TransactionStatus.PreparingPaymaster &&
		status.value !== TransactionStatus.Failed
	)
})

// Maximum possible fee calculation
const maxPossibleFee = computed(() => {
	if (!userOp.value) return null

	const op = userOp.value.preview()

	// Maximum possible fee (worst case)
	const maxTotalGas =
		BigInt(op.verificationGasLimit) +
		BigInt(op.callGasLimit) +
		BigInt(op.preVerificationGas) +
		BigInt(op.paymasterVerificationGasLimit || 0) +
		BigInt(op.paymasterPostOpGasLimit || 0)

	const maxFeeWei = maxTotalGas * BigInt(op.maxFeePerGas)
	const maxFeeGwei = Number(maxFeeWei) / 1e9 // Convert wei to Gwei

	const maxFeeEth = Number(formatEther(maxFeeWei))
	const usdValue = ethUsdPrice.value ? maxFeeEth * ethUsdPrice.value : null

	return {
		wei: maxFeeWei,
		gwei: maxFeeGwei,
		formatted: Number(maxFeeGwei.toFixed(0)).toLocaleString(),
		eth: maxFeeEth,
		usd: usdValue,
		usdFormatted: usdValue ? `$${usdValue.toFixed(4)}` : null,
	}
})

// Effective transaction fee (actual fee paid)
const effectiveTransactionFee = computed(() => {
	if (!opReceipt.value || status.value !== TransactionStatus.Success) return null

	// Use actualGasCost if available, otherwise calculate from actualGasUsed
	if (opReceipt.value.actualGasCost) {
		const actualGasCostGwei = Number(opReceipt.value.actualGasCost) / 1e9 // Convert wei to Gwei
		const actualGasCostEth = Number(formatEther(opReceipt.value.actualGasCost))
		const usdValue = ethUsdPrice.value ? actualGasCostEth * ethUsdPrice.value : null

		return {
			wei: opReceipt.value.actualGasCost,
			gwei: actualGasCostGwei,
			formatted: Number(actualGasCostGwei.toFixed(0)).toLocaleString(),
			eth: actualGasCostEth,
			usd: usdValue,
			usdFormatted: usdValue ? `$${usdValue.toFixed(4)}` : null,
		}
	}

	return null
})

// Show effective fee when transaction is successful and we have receipt data
const shouldShowEffectiveFee = computed(() => {
	return status.value === TransactionStatus.Success && effectiveTransactionFee.value
})
</script>
<template>
	<div class="flex flex-col h-full">
		<!-- Header -->
		<div class="flex justify-between items-center border-b border-border px-4 py-1">
			<!-- Preview Button -->
			<Button
				variant="ghost"
				size="icon"
				@click="toggleUserOpPreview"
				:title="showUserOpPreview ? 'Back to Transaction' : 'Show UserOp Preview'"
				:disabled="!userOp"
			>
				<ArrowLeft v-if="showUserOpPreview" class="w-4 h-4" />
				<Code v-else class="w-4 h-4" />
			</Button>
			<!-- Title -->
			<div class="font-medium">{{ showUserOpPreview ? 'UserOp Preview' : 'Transaction' }}</div>
			<!-- Close Button -->
			<Button v-if="!showUserOpPreview" variant="ghost" size="icon" :disabled="!canClose" @click="onClickClose">
				<X class="w-4 h-4" />
			</Button>
			<div v-else class="w-9"></div>
		</div>

		<!-- UserOp Preview Screen -->
		<ExecutionModalOpPreview v-show="showUserOpPreview" :user-op="userOp" />

		<!-- Content -->
		<div
			v-show="!showUserOpPreview"
			class="flex-1 mt-2 space-y-6 px-4 pt-2 pb-4"
			:class="{
				'overflow-y-auto': useModalSpecificStyle,
				'max-h-[420px]': useModalSpecificStyle,
			}"
		>
			<!-- Signer -->
			<div class="space-y-3">
				<div class="text-sm font-medium">Signer</div>
				<div class="space-y-2">
					<!-- EOA Wallet -->
					<div
						v-if="showEOAWalletValidationMethod"
						class="flex flex-col p-2.5 border rounded-lg transition-all"
						:class="{
							'cursor-pointer': canSelectSigner,
							'opacity-50 cursor-not-allowed': signerSelectorDisabled,
							'border-primary': selectedSigner?.type === 'EOAWallet',
						}"
						@click="canSelectSigner && selectSigner('EOAWallet')"
					>
						<div>
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
							<div v-if="wallet.address" class="ml-4 text-xs text-muted-foreground">
								<Address :address="wallet.address" text-size="xs" button-size="xs" />
							</div>
						</div>
					</div>

					<!-- Passkey -->
					<div
						v-if="showPasskeyValidationMethod"
						class="flex flex-col p-2.5 border rounded-lg transition-all"
						:class="{
							'cursor-pointer': canSelectSigner,
							'opacity-50 cursor-not-allowed': signerSelectorDisabled,
							'border-primary': selectedSigner?.type === 'Passkey',
						}"
						@click="canSelectSigner && selectSigner('Passkey')"
					>
						<div>
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
							<div class="ml-4 text-xs text-muted-foreground">
								{{ selectedCredentialDisplay }}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Paymaster Selection -->
			<PaymasterSelector :paymaster-capability="props.paymasterCapability" />

			<!-- Account section -->
			<div class="space-y-4">
				<div class="p-4 bg-muted/30 border border-border/50 rounded-lg space-y-3">
					<!-- Sender Address -->
					<div class="flex items-center justify-between text-sm">
						<div class="text-muted-foreground">Sender</div>
						<Address :address="selectedAccount?.address || ''" button-size="xs" text-size="sm" />
					</div>

					<!-- Network & Infrastructure -->
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Network</span>
						<NetworkSelector :fixed-chain="true" />
					</div>

					<!-- Account Type -->
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Account Type</span>
						<span class="text-sm">{{
							selectedAccount?.accountId ? AccountRegistry.getName(selectedAccount.accountId) : '-'
						}}</span>
					</div>

					<!-- Entry Point Version -->
					<div v-if="currentEntryPointAddress" class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">EntryPoint</span>
						<span class="text-sm">{{ addressToName(currentEntryPointAddress) }}</span>
					</div>

					<!-- Deployment Status -->
					<div
						v-if="!isLoadingCode && !isDeployed && selectedAccount?.category === 'Smart Account'"
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
				<div
					v-if="!isLoadingCode && !isDeployed && selectedAccount?.category === 'Smart Account'"
					class="warning-section flex items-center gap-1.5"
				>
					<Info class="w-4 h-4" />
					<div>This transaction will deploy your account</div>
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
									<Address :address="execution.to" button-size="xs" text-size="xs" />
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
		<div
			v-show="!showUserOpPreview && status !== TransactionStatus.PreparingPaymaster"
			class="sticky bottom-0 bg-background space-y-2 px-4 py-4 border-t border-border"
		>
			<!-- Fee Display -->
			<div class="flex flex-col text-xs px-2">
				<!-- Possible Fee -->
				<div v-if="shouldShowMaxFee && maxPossibleFee" class="flex items-center justify-between">
					<span class="text-muted-foreground">Possible Gas Fee</span>
					<div class="text-right">
						<div>
							&lt; {{ maxPossibleFee.formatted }} Gwei
							<span v-if="maxPossibleFee.usdFormatted">({{ maxPossibleFee.usdFormatted }})</span>
						</div>
					</div>
				</div>

				<!-- Effective Fee -->
				<div v-if="shouldShowEffectiveFee && effectiveTransactionFee" class="flex items-center justify-between">
					<span class="text-muted-foreground">Effective Gas Fee</span>
					<div class="text-right">
						<div>
							{{ effectiveTransactionFee.formatted }} Gwei
							<span v-if="effectiveTransactionFee.usdFormatted">
								({{ effectiveTransactionFee.usdFormatted }})
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Transaction Status Display -->
			<div
				v-if="status === TransactionStatus.Success || status === TransactionStatus.Failed"
				class="rounded-lg text-center space-y-2"
			>
				<template v-if="status === TransactionStatus.Success">
					<div class="flex flex-col items-center justify-center">
						<h3 class="text-xl font-semibold text-emerald-500">Transaction Successful!</h3>
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
						<p v-if="executionError" class="mt-2 text-sm text-muted-foreground">
							{{ executionError }}
						</p>
					</div>
				</template>
			</div>

			<!-- ============================ Action buttons ============================ -->
			<div>
				<div v-if="isLoadingCode" class="flex justify-center py-4">
					<Loader2 class="w-6 h-6 animate-spin text-primary" />
				</div>

				<div v-else>
					<!-- Estimate Button -->
					<Button
						v-if="status === TransactionStatus.Initial || status === TransactionStatus.Estimating"
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
</template>
