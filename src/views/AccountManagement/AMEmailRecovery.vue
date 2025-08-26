<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getInstallModuleData } from '@/lib/accounts/account-specific'
import {
	checkAcceptanceRequest,
	completeRecovery,
	createOwnableEmailRecovery,
	EMAIL_RECOVERY_EXECUTOR_ADDRESS,
	getRecoveryTimeLeft,
	isRecoveryRequestExists,
	sendAcceptanceRequest,
	sendRecoveryRequest,
} from '@/lib/email-recovery'
import { toRoute } from '@/lib/router'
import type { ImportedAccount } from '@/stores/account/account'
import { TESTNET_CHAIN_ID } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import type { TxModalExecution } from '@/stores/useTxModal'
import { useTxModal } from '@/stores/useTxModal'
import { ChevronDown, ChevronUp, Info, Loader2 } from 'lucide-vue-next'
import { ADDRESS, ERC7579_MODULE_TYPE, IERC7579Account__factory } from 'sendop'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'

const props = defineProps<{
	selectedAccount: ImportedAccount
	isDeployed: boolean
	isModular: boolean
}>()

const { selectedChainId, switchChain, client } = useBlockchain()
const { openModal } = useTxModal()

const isLoading = ref(false)
const isMountLoading = ref(true)
const error = ref<string | null>(null)
const hasOwnableValidator = ref(false)
const hasEmailRecoveryExecutor = ref(false)

// Info section collapse state
const isInfoExpanded = ref(false)

// Email recovery setup state
const guardianEmail = ref('')
const timelockValue = ref('6')
const timelockUnit = ref('hours')
const expiryValue = ref('14')
const expiryUnit = ref('days')
const acceptanceChecked = ref(false)

// Select options
const timelockItems = [
	{ value: 'hours', label: 'Hours' },
	{ value: 'days', label: 'Days' },
]

const expiryItems = [
	{ value: 'days', label: 'Days' },
	{ value: 'weeks', label: 'Weeks' },
]

// Email recovery request state
const newOwnerAddress = ref('')
const recoveryRequested = ref(false)
const recoveryTimeLeft = ref(0n)
const canCompleteRecovery = ref(false)

const isOnBaseSepolia = computed(() => selectedChainId.value === TESTNET_CHAIN_ID.BASE_SEPOLIA)

onMounted(async () => {
	try {
		await checkHasOwnableValidator()
		await checkHasEmailRecoveryExecutor()

		if (hasEmailRecoveryExecutor.value) {
			await checkAcceptanceStatus()

			if (acceptanceChecked.value) {
				await checkRecoveryStatus()
			}
		}
	} catch (e) {
		throw e
	} finally {
		isMountLoading.value = false
	}
})

async function checkHasOwnableValidator() {
	if (!props.isModular) {
		hasOwnableValidator.value = false
		return
	}

	if (!props.isDeployed) {
		// Check if account has OwnableValidator in vMethods
		hasOwnableValidator.value =
			props.selectedAccount.vMethods?.some(vMethod => vMethod.name === 'OwnableValidator') ?? false
		return
	}

	try {
		const account = IERC7579Account__factory.connect(props.selectedAccount.address, client.value)
		hasOwnableValidator.value = await account.isModuleInstalled(
			ERC7579_MODULE_TYPE.VALIDATOR,
			ADDRESS.OwnableValidator,
			'0x',
		)
	} catch (error) {
		hasOwnableValidator.value = false
		throw new Error('Error checking OwnableValidator:', { cause: error })
	}
}

async function checkHasEmailRecoveryExecutor() {
	if (!props.isDeployed || !props.isModular) {
		hasEmailRecoveryExecutor.value = false
		return
	}

	try {
		const account = IERC7579Account__factory.connect(props.selectedAccount.address, client.value)
		hasEmailRecoveryExecutor.value = await account.isModuleInstalled(
			ERC7579_MODULE_TYPE.EXECUTOR,
			EMAIL_RECOVERY_EXECUTOR_ADDRESS,
			'0x',
		)
	} catch (error) {
		hasEmailRecoveryExecutor.value = false
		throw new Error('Error checking EmailRecoveryExecutor:', { cause: error })
	}
}

const canUseEmailRecovery = computed(() => {
	return isOnBaseSepolia.value && hasOwnableValidator.value
})

const recoveryTimeLeftFormatted = computed(() => {
	if (recoveryTimeLeft.value <= 0n) return 'Ready'

	const seconds = Number(recoveryTimeLeft.value)
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = seconds % 60

	if (hours > 0) {
		return `${hours} Hours, ${minutes} Mins and ${secs} Secs`
	} else if (minutes > 0) {
		return `${minutes} Mins and ${secs} Secs`
	} else {
		return `${secs} Secs`
	}
})

async function onClickSwitchToBaseSepolia() {
	switchChain(TESTNET_CHAIN_ID.BASE_SEPOLIA)
}

async function onClickConfigureRecovery() {
	if (!canUseEmailRecovery.value) return
	if (!guardianEmail.value) {
		toast.error('Please enter guardian email')
		return
	}

	// Validate timelock - must be at least 6 hours
	const timelockSeconds = parseInt(timelockValue.value) * (timelockUnit.value === 'hours' ? 3600 : 86400)
	if (timelockSeconds < 21600) {
		// 6 hours in seconds
		toast.error('Recovery delay must be at least 6 hours')
		return
	}

	isLoading.value = true
	error.value = null

	try {
		// Create email recovery module configuration
		const emailRecoveryData = await createOwnableEmailRecovery({
			client: client.value,
			accountAddress: props.selectedAccount.address,
			email: guardianEmail.value,
			delay: BigInt(parseInt(timelockValue.value) * (timelockUnit.value === 'hours' ? 3600 : 86400)),
			expiry: BigInt(parseInt(expiryValue.value) * (expiryUnit.value === 'days' ? 86400 : 7 * 86400)),
		})

		// Install the email recovery executor module
		const execution: TxModalExecution = {
			description: 'Install Email Recovery Module',
			to: props.selectedAccount.address,
			data: getInstallModuleData(props.selectedAccount.accountId, emailRecoveryData.module),
			value: 0n,
		}

		openModal({
			executions: [execution],
			onSuccess: async () => {
				// Send acceptance request to guardian
				await sendAcceptanceRequest(
					client.value,
					guardianEmail.value,
					props.selectedAccount.address,
					emailRecoveryData.accountCode,
				)

				hasEmailRecoveryExecutor.value = true
				toast.success('Email Recovery setup initiated. Please check your email.', {
					duration: 7000,
				})

				// Start checking for acceptance
				checkAcceptanceStatus()
			},
		})
	} catch (e) {
		error.value = `Failed to setup email recovery: ${e instanceof Error ? e.message : 'Unknown error'}`
		toast.error(error.value)
	} finally {
		isLoading.value = false
	}
}

async function checkAcceptanceStatus() {
	if (!hasEmailRecoveryExecutor.value || acceptanceChecked.value) return

	try {
		const canStart = await checkAcceptanceRequest(
			client.value,
			props.selectedAccount.address,
			ADDRESS.OwnableValidator,
		)
		if (canStart) {
			acceptanceChecked.value = true
		}
	} catch (e) {
		throw new Error('Failed to check acceptance status', { cause: e })
	}
}

async function initiateRecovery() {
	if (!newOwnerAddress.value) {
		toast.error('Please enter new owner address')
		return
	}

	isLoading.value = true
	error.value = null

	try {
		await sendRecoveryRequest({
			client: client.value,
			accountAddress: props.selectedAccount.address,
			guardianEmail: guardianEmail.value,
			newOwner: newOwnerAddress.value,
		})

		toast.success('Recovery request sent. Please check your email and follow the instructions.', {
			duration: 7000,
		})

		// Start checking recovery status
		checkRecoveryStatus()
	} catch (e) {
		error.value = `Failed to initiate recovery: ${e instanceof Error ? e.message : 'Unknown error'}`
		toast.error(error.value)
	} finally {
		isLoading.value = false
	}
}

async function checkRecoveryStatus() {
	try {
		const exists = await isRecoveryRequestExists(client.value, props.selectedAccount.address)

		if (exists) {
			recoveryRequested.value = true
			const timeLeft = await getRecoveryTimeLeft(client.value, props.selectedAccount.address)
			recoveryTimeLeft.value = timeLeft

			if (timeLeft <= 0n) {
				canCompleteRecovery.value = true
				toast.success('Recovery delay has passed. You can now complete recovery.')
			}
		}
	} catch (e) {
		throw new Error('Error checking recovery status:', { cause: e })
	}
}

async function completeRecoveryProcess() {
	isLoading.value = true
	error.value = null

	try {
		await completeRecovery(client.value, props.selectedAccount.address, newOwnerAddress.value)
		toast.success('Recovery completed successfully!')

		// Reset state
		recoveryRequested.value = false
		canCompleteRecovery.value = false
		newOwnerAddress.value = ''
	} catch (e) {
		error.value = `Failed to complete recovery: ${e instanceof Error ? e.message : 'Unknown error'}`
		throw new Error('Failed to complete recovery:', { cause: e })
	} finally {
		isLoading.value = false
	}
}

function onClickCancelRecovery() {
	// TODO: Implement cancel recovery if needed
	console.log('onClickCancelRecovery')
	// recoveryRequested.value = false
	// canCompleteRecovery.value = false
	// recoveryTimeLeft.value = 0n
}
</script>

<template>
	<Card>
		<div class="space-y-4 p-5">
			<!-- How it works -->
			<div class="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
				<!-- Collapsible Header -->
				<div
					@click="isInfoExpanded = !isInfoExpanded"
					class="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30"
				>
					<Info class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
					<h4 class="text-sm font-medium text-blue-900 dark:text-blue-100 flex-1">How it works</h4>
					<component
						:is="isInfoExpanded ? ChevronUp : ChevronDown"
						class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
					/>
				</div>

				<!-- Collapsible Content -->
				<div v-if="isInfoExpanded" class="pb-4">
					<p class="text-sm text-blue-800 dark:text-blue-200 pl-8">
						When a user requests email recovery, the EmailRecoveryExecutor module calls the addOwner
						function on the OwnableValidator module. This adds a new owner to the account, thereby enabling
						wallet recovery.
					</p>
				</div>
			</div>

			<div class="space-y-4">
				<!-- Loading State -->
				<div v-if="isMountLoading" class="flex items-center justify-center py-8">
					<Loader2 class="w-6 h-6 animate-spin" />
					<span class="ml-2 text-sm text-muted-foreground">Loading email recovery status...</span>
				</div>

				<!-- Network Check -->
				<div v-else-if="!isOnBaseSepolia" class="space-y-3">
					<div class="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
						<Info class="w-4 h-4 text-yellow-500 flex-shrink-0" />
						<div class="text-sm text-yellow-700 dark:text-yellow-400">
							Email recovery is only available on Base Sepolia network
						</div>
					</div>
					<Button variant="outline" @click="onClickSwitchToBaseSepolia"> Switch to Base Sepolia </Button>
				</div>

				<!-- OwnableValidator Check -->
				<div v-else-if="!hasOwnableValidator" class="space-y-3">
					<div class="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
						<Info class="w-4 h-4 text-yellow-500 flex-shrink-0" />
						<div class="text-sm text-yellow-700 dark:text-yellow-400">
							Email recovery requires OwnableValidator. Please install it in the Modules section.
						</div>
					</div>
					<div>
						<RouterLink :to="toRoute('account-modules', { address: selectedAccount.address })">
							<Button variant="outline"> Go to Modules </Button>
						</RouterLink>
					</div>
				</div>

				<!-- Account not deployed -->
				<div v-else-if="!isDeployed" class="text-sm text-muted-foreground">
					Account must be deployed to use email recovery
				</div>

				<!-- Account not modular -->
				<div v-else-if="!isModular" class="text-sm text-muted-foreground">
					Account must be modular to use email recovery
				</div>

				<!-- Main Email Recovery Interface -->
				<div v-else class="space-y-6">
					<!-- Error Display -->
					<div v-if="error" class="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
						<p class="text-sm text-red-700 dark:text-red-400">{{ error }}</p>
					</div>

					<!-- Setup Flow -->
					<div v-if="!hasEmailRecoveryExecutor">
						<div class="space-y-4">
							<div class="text-center space-y-2">
								<h4 class="text-lg font-medium">Set Up Email Recovery</h4>
							</div>

							<div class="space-y-4">
								<div class="space-y-2">
									<label class="text-sm font-medium">Guardian's Email</label>
									<Input
										v-model="guardianEmail"
										type="email"
										placeholder="guardian@example.com"
										:disabled="isLoading"
									/>
								</div>

								<div class="space-y-2">
									<label class="text-sm font-medium">Recovery Delay (Timelock)</label>
									<div class="flex gap-2">
										<Input
											v-model="timelockValue"
											type="number"
											min="6"
											class="w-24"
											:disabled="isLoading"
										/>
										<div class="w-24">
											<Select v-model="timelockUnit" :disabled="isLoading">
												<SelectTrigger class="text-sm">
													<SelectValue placeholder="Select unit">
														{{
															timelockItems.find(item => item.value === timelockUnit)
																?.label
														}}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													<SelectItem
														v-for="item in timelockItems"
														:key="item.value"
														:value="item.value"
													>
														{{ item.label }}
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
									<p class="text-xs text-muted-foreground">Recovery delay must be at least 6 hours</p>
								</div>

								<div class="space-y-2">
									<label class="text-sm font-medium">Recovery Request Expiry</label>
									<div class="flex gap-2">
										<Input
											v-model="expiryValue"
											type="number"
											min="1"
											class="w-24"
											:disabled="isLoading"
										/>
										<div class="w-24">
											<Select v-model="expiryUnit" :disabled="isLoading">
												<SelectTrigger class="text-sm">
													<SelectValue placeholder="Select unit">
														{{ expiryItems.find(item => item.value === expiryUnit)?.label }}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													<SelectItem
														v-for="item in expiryItems"
														:key="item.value"
														:value="item.value"
													>
														{{ item.label }}
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
									<p class="text-xs text-muted-foreground">
										Time after which recovery request expires
									</p>
								</div>

								<Button
									@click="onClickConfigureRecovery"
									:disabled="!guardianEmail || !timelockValue || !expiryValue || isLoading"
									:loading="isLoading"
									class="w-full"
								>
									Configure Recovery
								</Button>
							</div>
						</div>
					</div>

					<!-- Waiting for Guardian Acceptance -->
					<div v-else-if="!acceptanceChecked" class="text-center space-y-4">
						<div class="space-y-2">
							<h4 class="text-lg font-medium">Waiting for Guardian Confirmation</h4>
							<p class="text-sm text-muted-foreground">
								We've sent an email to your guardian. Please ask them to check their email and confirm.
							</p>
						</div>
					</div>

					<!-- Recovery Interface -->
					<div v-else class="space-y-6">
						<!-- Recovery Not Started -->
						<div v-if="!recoveryRequested" class="space-y-4">
							<div class="text-center space-y-2">
								<h4 class="text-lg font-medium">Recover this account</h4>
							</div>

							<div class="space-y-4 p-4 bg-card/50 border rounded-lg">
								<div class="space-y-3">
									<div class="space-y-2">
										<label class="text-sm font-medium">Guardian's Email</label>
										<Input
											v-model="guardianEmail"
											type="email"
											placeholder="guardian@example.com"
											:disabled="isLoading"
										/>
									</div>

									<div class="space-y-2">
										<label class="text-sm font-medium">Requested New Owner Address</label>
										<Input
											v-model="newOwnerAddress"
											placeholder="0xAB12..."
											:disabled="isLoading"
										/>
									</div>
								</div>

								<Button
									@click="initiateRecovery"
									:disabled="!newOwnerAddress || isLoading"
									:loading="isLoading"
									class="w-full"
								>
									Send Recovery Request
								</Button>
							</div>
						</div>

						<!-- Recovery in Progress -->
						<div v-else class="space-y-4">
							<div class="text-center space-y-2">
								<h4 class="text-lg font-medium">Recover Request Sent</h4>
								<div v-if="recoveryTimeLeft > 0n" class="space-y-2">
									<p class="text-sm text-muted-foreground">
										You can recover this account in {{ recoveryTimeLeftFormatted }}.
									</p>
								</div>
							</div>

							<div class="space-y-4 p-4">
								<div class="flex gap-2">
									<Button variant="outline" @click="onClickCancelRecovery" class="flex-1">
										Cancel Recovery
									</Button>
									<Button
										@click="completeRecoveryProcess"
										:loading="isLoading"
										class="flex-1"
										:disabled="!canCompleteRecovery"
									>
										Complete Recovery
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Card>
</template>

<style lang="css" scoped></style>
