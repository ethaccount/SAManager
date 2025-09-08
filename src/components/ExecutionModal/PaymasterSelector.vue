<script setup lang="ts">
import { TransactionStatus, useExecutionModal } from '@/components/ExecutionModal'
import Address from '@/components/utils/Address.vue'
import { PaymasterServiceCapability } from '@/features/account-capabilities'
import { isTestnet } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { getErrorMessage } from '@samanager/sdk'
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-vue-next'
import { isSameAddress, PaymasterService } from 'sendop'
import { usePaymaster } from './paymasters/usePaymaster'

const props = withDefaults(
	defineProps<{
		paymasterCapability?: PaymasterServiceCapability
	}>(),
	{},
)

const { selectedChainId, currentEntryPointAddress } = useBlockchain()
const { status } = useExecutionModal()
const {
	selectedPaymaster,
	paymasters,
	formattedUsdcBalance,
	formattedUsdcAllowance,
	isCheckingUsdcData,
	permitAllowanceAmount,
	isValidPermitAmount,
	usdcAddress,
	isSigningPermit,
	handleSignUsdcPermit,
	usdcPaymasterAddress,
	usdcAllowance,
	hasUsdcPermitSignature,
	usdcBalance,
	usdcPaymasterData,
} = usePaymaster()

// Expansion state for permit USDC section
const isPermitSectionExpanded = ref(false)

const isCheckingPaymasterSupport = ref(false)

onMounted(async () => {
	if (props.paymasterCapability) {
		try {
			selectedPaymaster.value = 'erc7677'
			isCheckingPaymasterSupport.value = true
			// check supported entrypoints
			const paymasterService = new PaymasterService(props.paymasterCapability.url, selectedChainId.value)
			const supportedEntryPoints = await paymasterService.supportedEntryPoints()
			if (!supportedEntryPoints.some(entryPoint => isSameAddress(entryPoint, currentEntryPointAddress.value))) {
				throw new Error('Paymaster service does not support the current entrypoint')
			}
		} catch (err) {
			selectedPaymaster.value = 'none'
			throw new Error(`Error initializing paymaster service: ${getErrorMessage(err)}`, { cause: err })
		} finally {
			isCheckingPaymasterSupport.value = false
		}
	}
})

// Watch status to auto-expand/collapse permit section
watchImmediate(status, newStatus => {
	// auto-expand when PreparingPaymaster, auto-collapse when not
	if (newStatus === TransactionStatus.PreparingPaymaster) {
		isPermitSectionExpanded.value = true
	} else {
		isPermitSectionExpanded.value = false
	}
})

const paymasterSelectorDisabled = computed(() => {
	return status.value !== TransactionStatus.Initial && status.value !== TransactionStatus.PreparingPaymaster
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

function togglePermitSectionExpansion() {
	isPermitSectionExpanded.value = !isPermitSectionExpanded.value
}

async function onClickSignPermit() {
	const { useGetCode } = await import('@/lib/useGetCode')
	const { isDeployed } = useGetCode()

	await handleSignUsdcPermit(isDeployed.value)

	// only when the data is set, users can start estimating the gas
	if (usdcPaymasterData.value) {
		status.value = TransactionStatus.Initial
	}
}

const canSignPermit = computed(() => {
	const { isValidPermitAmount, isSigningPermit } = usePaymaster()
	return (
		selectedPaymaster.value === 'usdc' &&
		isValidPermitAmount.value &&
		!isSigningPermit.value &&
		(status.value === TransactionStatus.Initial || status.value === TransactionStatus.PreparingPaymaster)
	)
})

const paymasterName = computed(() => {
	if (selectedPaymaster.value === 'erc7677' && props.paymasterCapability?.context?.name) {
		return props.paymasterCapability.context.name
	}
	return paymasters.value.find(p => p.id === selectedPaymaster.value)?.name
})

const paymasterIcon = computed<string | null>(() => {
	if (
		selectedPaymaster.value === 'erc7677' &&
		props.paymasterCapability?.context?.icon &&
		typeof props.paymasterCapability.context.icon === 'string'
	) {
		return props.paymasterCapability.context.icon
	}
	return null
})
</script>

<template>
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
					<div class="flex items-center justify-between w-full gap-2">
						<img v-if="paymasterIcon" :src="paymasterIcon" class="w-4 h-4 rounded-full" />
						<span class="font-medium">
							{{ paymasterName }}
						</span>

						<span v-if="isCheckingPaymasterSupport" class="flex items-center gap-1">
							<Loader2 class="w-4 h-4 animate-spin" />
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
				<div v-if="isCheckingUsdcData" class="flex items-center gap-2 text-sm text-muted-foreground">
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
						<span class="font-mono" :class="hasUsdcBalance ? 'text-primary' : 'text-yellow-600'">
							{{ formattedUsdcBalance ?? 'N/A' }} USDC
						</span>
					</div>

					<!-- USDC Allowance -->
					<div class="flex items-center justify-between text-xs">
						<div class="flex items-center gap-2">
							<span>USDC Allowance</span>
						</div>
						<span class="font-mono" :class="hasUsdcAllowance ? 'text-primary' : 'text-yellow-600'">
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
					(status === TransactionStatus.Initial || status === TransactionStatus.PreparingPaymaster)
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
							<span v-else-if="!isValidPermitAmount" class="text-muted-foreground"> Invalid Amount </span>
							<span v-else> Sign Permit </span>
						</Button>

						<div class="text-xs text-muted-foreground">
							This will allow the paymaster to spend up to {{ permitAllowanceAmount }} USDC from your
							account to pay for gas fees.
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
