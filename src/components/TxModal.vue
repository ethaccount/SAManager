<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Address from '@/components/utils/Address.vue'
import { AccountRegistry } from '@/lib/accounts'
import { addressToName } from '@/lib/addressToName'
import { getErrorChainMessage, getErrorMsg, getEthersErrorMsg, isEthersError, isUserRejectedError } from '@/lib/error'
import { useGetCode } from '@/lib/useGetCode'
import { deserializeValidationMethod } from '@/lib/validations'
import { useAccount } from '@/stores/account/useAccount'
import { displayChainName, getEntryPointAddress, isTestnet } from '@/stores/blockchain/blockchain'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/useSigner'
import { TransactionStatus, TxModalExecution, useTxModal } from '@/stores/useTxModal'
import { shortenAddress } from '@vue-dapp/core'
import { formatEther } from 'ethers'
import { ArrowLeft, ChevronDown, ChevronUp, CircleDot, Code, ExternalLink, Loader2, X } from 'lucide-vue-next'
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
import TxModalUOPreview from './TxModalOpPreview.vue'

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
	formattedUsdcBalance,
	formattedUsdcAllowance,
	isCheckingUsdcData,
	permitAllowanceAmount,
	isValidPermitAmount,
	usdcAddress,
	isSigningPermit,
	canSignPermit,
	handleSignUsdcPermit,
	handleEstimate,
	handleSign,
	handleSend,
	resetTxModal,
	checkUsdcBalanceAndAllowance,
	usdcPaymasterData,
	usdcPaymasterAddress,
	usdcAllowance,
	hasUsdcPermitSignature,
	usdcBalance,
} = useTxModal()

const { isDeployed, getCode, loading: isLoadingCode } = useGetCode()
const { currentEntryPointAddress, setEntryPointAddress } = useBlockchain()

// When the TxModal is opened
onMounted(async () => {
	// Check if account is connected
	if (!isAccountAccessible.value) {
		emit('close')
		toast.error('Account not connected')
		return
	}

	if (!selectedAccount.value) {
		throw new Error('[TxModal#onMounted] No account selected')
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
	resetTxModal()
})

// This cannot be placed in useTxModal because it needs to be executed immediately when the TxModal is mounted
watchImmediate(selectedPaymaster, async newPaymaster => {
	if (status.value === TransactionStatus.Initial) {
		if (newPaymaster === 'usdc') {
			status.value = TransactionStatus.PreparingPaymaster
			await checkUsdcBalanceAndAllowance()
			if (usdcPaymasterData.value) {
				status.value = TransactionStatus.Initial
			}
		} else {
			status.value = TransactionStatus.Initial
		}
	}

	// from usdc paymaster to other paymaster
	if (status.value === TransactionStatus.PreparingPaymaster && newPaymaster !== 'usdc') {
		status.value = TransactionStatus.Initial
	}
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

// Expansion state for permit USDC section
const isPermitSectionExpanded = ref(false)

function togglePermitSectionExpansion() {
	isPermitSectionExpanded.value = !isPermitSectionExpanded.value
}

// UserOp preview state
const showUserOpPreview = ref(false)

function toggleUserOpPreview() {
	showUserOpPreview.value = !showUserOpPreview.value
}

watchImmediate(status, (newStatus, oldStatus) => {
	// Auto send when signing is done
	if (oldStatus === TransactionStatus.Signing && newStatus === TransactionStatus.Send) {
		onClickSend()
	}

	// auto-expand when PreparingPaymaster, auto-collapse when not
	if (newStatus === TransactionStatus.PreparingPaymaster) {
		isPermitSectionExpanded.value = true
	} else {
		isPermitSectionExpanded.value = false
	}
})

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
		status.value = TransactionStatus.Initial
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
			const errorMsg = getEthersErrorMsg(e, prefix)
			// Check for chain ID mismatch error
			const chainMismatchMatch = errorMsg.match(/Provided chainId "(\d+)" must match the active chainId "(\d+)"/)
			if (chainMismatchMatch) {
				const expectedChainId = chainMismatchMatch[1]
				const currentChainName = displayChainName(Number(expectedChainId))
				msg = `Please switch your EOA Wallet network to ${currentChainName} to sign the user operation`
			} else {
				msg = errorMsg
			}
		} else {
			msg = getErrorMsg(e, prefix)
		}

		// User rejected signing on browser wallet or passkey. Don't show error message
		if (isUserRejectedError(e)) {
			msg = ''
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
		status.value = TransactionStatus.Initial
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

const paymasterSelectorDisabled = computed(() => {
	return status.value !== TransactionStatus.Initial && status.value !== TransactionStatus.PreparingPaymaster
})

// Computed properties for signer selection
const canSelectSigner = computed(() => {
	return status.value === TransactionStatus.Initial || status.value === TransactionStatus.PreparingPaymaster
})

const signerSelectorDisabled = computed(() => {
	return !canSelectSigner.value
})

// Check if current chain is testnet
const isCurrentChainTestnet = computed(() => {
	return isTestnet(selectedChainId.value)
})

const hasUsdcAllowance = computed(() => {
	return usdcAllowance.value !== null && usdcAllowance.value > 0n
})

const hasUsdcBalance = computed(() => {
	return usdcBalance.value !== null && usdcBalance.value > 0n
})

async function onClickSignPermit() {
	await handleSignUsdcPermit()

	// only when the data is set, users can start estimating the gas
	if (usdcPaymasterData.value) {
		status.value = TransactionStatus.Initial
	}
}

// Computed property for maximum possible fee calculation
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

	return {
		wei: maxFeeWei,
		gwei: maxFeeGwei,
		formatted: maxFeeGwei.toFixed(2), // 2 decimal places for gwei display
	}
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

// Computed property for effective transaction fee (actual fee paid)
const effectiveTransactionFee = computed(() => {
	if (!opReceipt.value || status.value !== TransactionStatus.Success) return null

	// Use actualGasCost if available, otherwise calculate from actualGasUsed
	if (opReceipt.value.actualGasCost) {
		const actualGasCostGwei = Number(opReceipt.value.actualGasCost) / 1e9 // Convert wei to Gwei
		return {
			wei: opReceipt.value.actualGasCost,
			gwei: actualGasCostGwei,
			formatted: actualGasCostGwei.toFixed(2), // 2 decimal places for gwei display
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
			<div class="flex justify-between items-center border-b border-border px-4 py-1">
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
				<div class="font-medium">{{ showUserOpPreview ? 'UserOp Preview' : 'Transaction' }}</div>
				<Button variant="ghost" size="icon" :disabled="!canClose" @click="onClickClose">
					<X class="w-4 h-4" />
				</Button>
			</div>

			<!-- UserOp Preview Screen -->
			<TxModalUOPreview v-show="showUserOpPreview" :user-op="userOp" />

			<!-- Content -->
			<div v-show="!showUserOpPreview" class="flex-1 mt-2 space-y-6 overflow-y-auto max-h-[420px] px-4 pt-2 pb-4">
				<!-- Signer -->
				<div class="space-y-3">
					<div class="text-sm font-medium">Signer</div>
					<div class="space-y-2">
						<!-- EOA-Owned or SmartEOA -->
						<div
							v-if="showEOAWalletValidationMethod"
							class="flex flex-col p-2.5 border rounded-lg transition-all"
							:class="{
								'cursor-pointer': canSelectSigner,
								'opacity-50 cursor-not-allowed': signerSelectorDisabled,
							}"
							@click="canSelectSigner && selectSigner('EOAWallet')"
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
								'cursor-pointer': canSelectSigner,
								'opacity-50 cursor-not-allowed': signerSelectorDisabled,
							}"
							@click="canSelectSigner && selectSigner('Passkey')"
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

				<!-- Paymaster Selection -->
				<div class="space-y-3">
					<div class="text-sm font-medium">Paymaster</div>
					<Select v-model="selectedPaymaster" :disabled="paymasterSelectorDisabled">
						<SelectTrigger
							class=""
							:class="{
								'hover:border-primary': !paymasterSelectorDisabled,
							}"
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

					<!-- USDC Paymaster Checks -->
					<div
						v-if="
							selectedPaymaster === 'usdc' &&
							(status === TransactionStatus.Initial || status === TransactionStatus.PreparingPaymaster)
						"
						class="space-y-2 mt-3 p-3 bg-muted/20 rounded-lg border"
					>
						<div>
							<!-- Loading State -->
							<div
								v-if="isCheckingUsdcData"
								class="flex items-center gap-2 text-sm text-muted-foreground"
							>
								<Loader2 class="w-4 h-4 animate-spin" />
								Checking USDC balance and allowance...
							</div>

							<div v-else class="space-y-1">
								<!-- USDC Address -->
								<div class="flex items-center justify-between text-xs">
									<div class="flex items-center gap-2">
										<span>USDC Address</span>
									</div>
									<Address :address="usdcAddress ?? ''" button-size="xs" text-size="xs" />
								</div>

								<!-- USDC Paymaster Address -->
								<div class="flex items-center justify-between text-xs">
									<div class="flex items-center gap-2">
										<span>USDC Paymaster Address</span>
									</div>
									<Address :address="usdcPaymasterAddress ?? ''" button-size="xs" text-size="xs" />
								</div>

								<!-- USDC Balance -->
								<div class="flex items-center justify-between text-xs">
									<div class="flex items-center gap-2">
										<span>USDC Balance</span>
									</div>
									<span
										class="font-mono"
										:class="hasUsdcBalance ? 'text-primary' : 'text-yellow-600'"
									>
										{{ formattedUsdcBalance ?? 'N/A' }} USDC
									</span>
								</div>

								<!-- USDC Allowance -->
								<div class="flex items-center justify-between text-xs">
									<div class="flex items-center gap-2">
										<span>USDC Allowance</span>
									</div>
									<span
										class="font-mono"
										:class="hasUsdcAllowance ? 'text-primary' : 'text-yellow-600'"
									>
										{{ formattedUsdcAllowance ?? 'N/A' }} USDC
									</span>
								</div>

								<!-- USDC Permit Signature -->
								<div class="flex items-center justify-between text-xs">
									<div class="flex items-center gap-2">
										<span>Permit Signature</span>
									</div>
									<span
										class="font-mono"
										:class="
											hasUsdcPermitSignature
												? 'text-green-600'
												: !hasUsdcAllowance
													? 'text-yellow-600'
													: 'text-muted-foreground'
										"
									>
										{{ hasUsdcPermitSignature ? 'Signed' : 'None' }}
									</span>
								</div>
							</div>
						</div>

						<!-- Message about needing sufficient balance -->
						<div
							v-if="!isCheckingUsdcData && !hasUsdcBalance"
							class="text-xs text-yellow-600 dark:text-yellow-400 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800"
						>
							⚠️ You need some USDC in your account to pay for gas fees.
							<span v-if="isCurrentChainTestnet">
								<a
									href="https://faucet.circle.com/"
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
								>
									USDC Faucet
									<ExternalLink class="w-3 h-3" />
								</a>
							</span>
						</div>

						<!-- Permit USDC Spend -->
						<div
							v-if="
								!isCheckingUsdcData &&
								hasUsdcBalance &&
								(status === TransactionStatus.Initial ||
									status === TransactionStatus.PreparingPaymaster)
							"
							class="border rounded-lg border-border"
						>
							<!-- Permit Section Header -->
							<div
								class="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 bg-muted/20"
								@click="togglePermitSectionExpansion"
							>
								<div class="text-xs font-medium text-foreground">Permit USDC Spend</div>
								<ChevronUp v-if="isPermitSectionExpanded" class="w-4 h-4 text-muted-foreground" />
								<ChevronDown v-else class="w-4 h-4 text-muted-foreground" />
							</div>

							<!-- Permit Section Details -->
							<div v-if="isPermitSectionExpanded" class="border-t bg-muted/20 border-border">
								<div class="p-3 space-y-2">
									<!-- Allowance amount input -->
									<div class="space-y-2">
										<div class="text-xs text-muted-foreground">Allowance Amount (USDC)</div>
										<Input
											v-model="permitAllowanceAmount"
											placeholder="Enter USDC amount"
											class="text-sm"
											:class="{
												'border-red-300 dark:border-red-700': !isValidPermitAmount,
											}"
										/>
										<div v-if="!isValidPermitAmount" class="text-xs text-red-500">
											Please enter a valid amount greater than 0
										</div>
									</div>

									<!-- Permit signature button -->
									<Button
										:disabled="!canSignPermit"
										:loading="isSigningPermit"
										@click="onClickSignPermit"
										class="w-full text-sm"
										variant="outline"
										size="sm"
									>
										<span v-if="isSigningPermit"> Signing Permit... </span>
										<span v-else-if="!hasUsdcBalance" class="text-muted-foreground">
											Insufficient USDC Balance
										</span>
										<span v-else-if="!isValidPermitAmount" class="text-muted-foreground">
											Invalid Amount
										</span>
										<span v-else> Sign Permit </span>
									</Button>

									<div class="text-xs text-muted-foreground">
										This will allow the paymaster to spend up to {{ permitAllowanceAmount }} USDC
										from your account to pay for gas fees.
									</div>
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
							<Address :address="selectedAccount?.address || ''" button-size="xs" text-size="sm" />
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
						<div v-if="currentEntryPointAddress" class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">EntryPoint</span>
							<span class="text-sm">{{ addressToName(currentEntryPointAddress) }}</span>
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
				class="space-y-2 px-4 py-4 border-t border-border"
			>
				<!-- Error message display -->
				<div v-if="error" class="error-section max-h-[100px] overflow-y-auto">
					{{ error }}
				</div>

				<!-- Fee Display -->
				<div class="flex flex-col text-xs px-2">
					<!-- Max Possible Fee -->
					<div v-if="shouldShowMaxFee && maxPossibleFee" class="flex items-center justify-between">
						<span class="text-muted-foreground">Max Possible Fee</span>
						<span class="">{{ maxPossibleFee.formatted }} Gwei</span>
					</div>

					<!-- Effective Fee -->
					<div
						v-if="shouldShowEffectiveFee && effectiveTransactionFee"
						class="flex items-center justify-between"
					>
						<span class="text-muted-foreground">Effective Fee</span>
						<span class="">{{ effectiveTransactionFee.formatted }} Gwei</span>
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
	</VueFinalModal>
</template>

<style lang="css">
.transaction-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}

.transaction-modal-content {
	@apply border border-border bg-background;
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
