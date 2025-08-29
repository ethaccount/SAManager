<script setup lang="ts">
import { OwnableValidatorAPI } from '@/api/OwnableValidatorAPI'
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
	getRecoveryRequest,
	sendAcceptanceRequest,
	sendRecoveryRequest,
} from '@/lib/email-recovery'
import { getErrorMessage } from '@/lib/error'
import { toRoute } from '@/lib/router'
import { deserializeValidationMethod, OwnableValidatorVMethod } from '@/lib/validations'
import type { ImportedAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { TESTNET_CHAIN_ID } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useEmailRecovery } from '@/stores/useEmailRecovery'
import type { TxModalExecution } from '@/stores/useTxModal'
import { useTxModal } from '@/stores/useTxModal'
import { Interface } from 'ethers'
import { ChevronDown, ChevronUp, Info, Loader2 } from 'lucide-vue-next'
import { ADDRESS, ERC7579_MODULE_TYPE, IERC7579Account__factory } from 'sendop'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'

const props = defineProps<{
	selectedAccount: ImportedAccount
	isDeployed: boolean
	isModular: boolean
}>()

const { selectedChainId, switchChain, client } = useBlockchain()
const { openModal } = useTxModal()
const { accountToNewOwnerAddress } = useEmailRecovery()

const isLoadingState = ref(true)
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

const timelockOptions = [
	{ value: 'hours', label: 'Hours' },
	{ value: 'days', label: 'Days' },
]

const expiryOptions = [
	{ value: 'days', label: 'Days' },
	{ value: 'weeks', label: 'Weeks' },
]

// request recovery state
const newOwnerAddress = ref('')
const isRecoveryRequestSent = ref(false) // relayer has sent the recovery request email
const isRecoveryRequestConfirmed = ref(false) // user has confirmed the recovery request email
const recoveryTimeLeft = ref(0n)
const recoveryExpiry = ref(0n)

function resetRecoveryRequestState() {
	newOwnerAddress.value = ''
	isRecoveryRequestSent.value = false
	isRecoveryRequestConfirmed.value = false
	recoveryTimeLeft.value = 0n
	recoveryExpiry.value = 0n
}

const canCompleteRecovery = computed(() => {
	if (!isRecoveryRequestConfirmed.value) return false
	return recoveryTimeLeft.value <= 0n && recoveryExpiry.value > 0n
})

const isRecoveryRequestExpired = computed(() => {
	if (!isRecoveryRequestConfirmed.value) return false
	return recoveryExpiry.value <= 0n
})

const isOnBaseSepolia = computed(() => selectedChainId.value === TESTNET_CHAIN_ID.BASE_SEPOLIA)

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

const expiryTimeLeftFormatted = computed(() => {
	if (recoveryExpiry.value <= 0n) return 'Expired'

	const seconds = Number(recoveryExpiry.value)
	const days = Math.floor(seconds / 86400)
	const hours = Math.floor((seconds % 86400) / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = seconds % 60

	if (days > 0) {
		return `${days} Days, ${hours} Hours and ${minutes} Mins`
	} else if (hours > 0) {
		return `${hours} Hours, ${minutes} Mins and ${secs} Secs`
	} else if (minutes > 0) {
		return `${minutes} Mins and ${secs} Secs`
	} else {
		return `${secs} Secs`
	}
})

watchImmediate(
	() => props.selectedAccount,
	async () => {
		try {
			isLoadingState.value = true
			await checkHasOwnableValidator()
			await checkHasEmailRecoveryExecutor()

			if (hasEmailRecoveryExecutor.value) {
				await checkAcceptanceStatus()

				if (acceptanceChecked.value) {
					await fetchRecoveryRequestStatus()
				}
			}

			// If recovery request is confirmed, give the new owner address from the store if it exists
			if (isRecoveryRequestConfirmed.value) {
				newOwnerAddress.value = accountToNewOwnerAddress.value[props.selectedAccount.address] ?? ''
			} else if (!acceptanceChecked.value) {
				// clear the new owner address from the store if the recovery is not setup
				if (accountToNewOwnerAddress.value[props.selectedAccount.address]) {
					delete accountToNewOwnerAddress.value[props.selectedAccount.address]
				}
			}
		} catch (e) {
			throw e
		} finally {
			isLoadingState.value = false
		}
	},
)

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

async function fetchRecoveryRequestStatus() {
	try {
		const { executeAfter, executeBefore } = await getRecoveryRequest({
			client: client.value,
			accountAddress: props.selectedAccount.address,
		})

		if (executeAfter === 0n) {
			isRecoveryRequestConfirmed.value = false
			return
		}

		isRecoveryRequestConfirmed.value = true

		const block = await client.value.getBlock('latest')
		if (!block) {
			throw new Error('Failed to get latest block')
		}

		recoveryTimeLeft.value = executeAfter - BigInt(block.timestamp)
		recoveryExpiry.value = executeBefore - BigInt(block.timestamp)
	} catch (e) {
		console.error('Error checking recovery status:', e)
		error.value = `Error checking recovery status: ${getErrorMessage(e)}`
	}
}

async function onClickSwitchToBaseSepolia() {
	switchChain(TESTNET_CHAIN_ID.BASE_SEPOLIA)
}

const isLoadingConfigureRecovery = ref(false)
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

	isLoadingConfigureRecovery.value = true
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

				// Start checking for acceptance
				checkAcceptanceStatus()
			},
		})
	} catch (e) {
		error.value = `Failed to setup email recovery: ${e instanceof Error ? e.message : 'Unknown error'}`
		toast.error(error.value)
	} finally {
		isLoadingConfigureRecovery.value = false
	}
}

const isLoadingSendRecoveryRequest = ref(false)
async function onClickSendRecoveryRequest() {
	if (!newOwnerAddress.value) {
		toast.error('Please enter new owner address')
		return
	}

	isLoadingSendRecoveryRequest.value = true
	error.value = null

	try {
		await sendRecoveryRequest({
			client: client.value,
			accountAddress: props.selectedAccount.address,
			guardianEmail: guardianEmail.value,
			newOwnerAddress: newOwnerAddress.value,
		})

		isRecoveryRequestSent.value = true
		accountToNewOwnerAddress.value[props.selectedAccount.address] = newOwnerAddress.value
	} catch (e) {
		console.error('Error initiating recovery:', e)
		error.value = `Error initiating recovery: ${getErrorMessage(e)}`
	} finally {
		isLoadingSendRecoveryRequest.value = false
	}
}

const isLoadingCompleteRecovery = ref(false)
async function onClickCompleteRecovery() {
	isLoadingCompleteRecovery.value = true
	error.value = null

	try {
		await completeRecovery(client.value, props.selectedAccount.address, newOwnerAddress.value)

		// Update OwnableValidator addresses
		const owners = await OwnableValidatorAPI.getOwners(client.value, props.selectedAccount.address)
		if (owners.length) {
			const { selectedAccount } = useAccount()
			if (!selectedAccount.value) {
				throw new Error('Updating OwnableValidator addresses: No selected account')
			}
			for (let i = 0; i < selectedAccount.value.vMethods.length; i++) {
				const vMethodData = selectedAccount.value.vMethods[i]
				if (vMethodData.name === 'OwnableValidator') {
					const vMethod = deserializeValidationMethod(vMethodData) as OwnableValidatorVMethod
					vMethod.addresses = owners
					selectedAccount.value.vMethods[i] = vMethod.serialize()
				}
			}
		}

		toast.success('Recovery completed successfully!')
		// After completion, the on-chain getRecoveryRequest data will be cleared, returning to a state with no recovery request.
		await fetchRecoveryRequestStatus()

		resetRecoveryRequestState()
	} catch (e) {
		console.error('Error completing recovery:', e)
		error.value = `Error completing recovery: ${getErrorMessage(e)}`
	} finally {
		isLoadingCompleteRecovery.value = false
	}
}

const isLoadingCancelRecovery = ref(false)
function onClickCancelRecovery() {
	if (!isRecoveryRequestConfirmed.value) {
		return
	}

	try {
		isLoadingCancelRecovery.value = true
		error.value = null

		let execution: TxModalExecution

		if (isRecoveryRequestExpired.value) {
			// call function cancelExpiredRecovery(address account)
			execution = {
				description: 'Cancel Expired Recovery',
				to: EMAIL_RECOVERY_EXECUTOR_ADDRESS,
				data: new Interface(['function cancelExpiredRecovery(address account)']).encodeFunctionData(
					'cancelExpiredRecovery',
					[props.selectedAccount.address],
				),
				value: 0n,
			}
		} else {
			// call function cancelRecovery()
			execution = {
				description: 'Cancel Recovery',
				to: EMAIL_RECOVERY_EXECUTOR_ADDRESS,
				data: new Interface(['function cancelRecovery()']).encodeFunctionData('cancelRecovery'),
				value: 0n,
			}
		}

		openModal({
			executions: [execution],
			onSuccess: async () => {
				toast.success('Recovery cancelled successfully!')
				resetRecoveryRequestState()
			},
		})
	} catch (e) {
		console.error('Error canceling recovery:', e)
		error.value = `Error canceling recovery: ${getErrorMessage(e)}`
	} finally {
		isLoadingCancelRecovery.value = false
	}
}

const isLoading = computed(() => {
	return (
		isLoadingState.value ||
		isLoadingConfigureRecovery.value ||
		isLoadingSendRecoveryRequest.value ||
		isLoadingCompleteRecovery.value ||
		isLoadingCancelRecovery.value
	)
})
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
				<div v-if="isLoadingState" class="flex items-center justify-center py-8">
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
															timelockOptions.find(item => item.value === timelockUnit)
																?.label
														}}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													<SelectItem
														v-for="item in timelockOptions"
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
														{{
															expiryOptions.find(item => item.value === expiryUnit)?.label
														}}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													<SelectItem
														v-for="item in expiryOptions"
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
									:loading="isLoadingConfigureRecovery"
									:disabled="!guardianEmail || !timelockValue || !expiryValue || isLoading"
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
								Email Recovery setup initiated. Please check your email and confirm.
							</p>
						</div>
					</div>

					<!-- Recovery Interface -->
					<div v-else class="space-y-6">
						<!-- Recovery Not Started -->
						<div v-if="!isRecoveryRequestConfirmed && !isRecoveryRequestSent" class="space-y-4">
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
										<Input v-model="newOwnerAddress" placeholder="0x..." :disabled="isLoading" />
									</div>
								</div>

								<Button
									@click="onClickSendRecoveryRequest"
									:disabled="!newOwnerAddress || isLoading"
									:loading="isLoadingSendRecoveryRequest"
									class="w-full"
								>
									Send Recovery Request
								</Button>
							</div>
						</div>

						<!-- Recovery Request Sent -->
						<div v-else-if="!isRecoveryRequestConfirmed && isRecoveryRequestSent">
							<div class="text-center space-y-2">
								<h4 class="text-lg font-medium">Waiting for Guardian Confirmation</h4>
								<p class="text-sm text-muted-foreground">
									Email recovery request sent. Please check your email and confirm.
								</p>
							</div>
						</div>

						<!-- Recovery Request Confirmed -->
						<div v-else class="space-y-4">
							<div class="text-center space-y-2">
								<h4 class="text-lg font-medium">Recover Request Confirmed</h4>
								<!-- Recovery delay not passed -->
								<div v-if="recoveryTimeLeft > 0n" class="space-y-2">
									<p class="text-sm text-muted-foreground">
										You can recover this account in {{ recoveryTimeLeftFormatted }}.
									</p>
									<p class="text-xs text-muted-foreground">
										Recovery request expires in {{ expiryTimeLeftFormatted }}.
									</p>
								</div>
								<!-- Recovery request expired -->
								<div v-else-if="isRecoveryRequestExpired">
									<p class="text-sm text-muted-foreground">
										Recovery request has expired. Please cancel the recovery request and start a new
										one.
									</p>
								</div>
								<!-- Recovery ready but not expired -->
								<div v-else-if="!isRecoveryRequestExpired" class="space-y-2">
									<p class="text-sm text-muted-foreground">
										Recovery request expires in {{ expiryTimeLeftFormatted }}.
									</p>
								</div>
							</div>

							<div class="space-y-2">
								<label class="text-sm font-medium">Requested New Owner Address</label>
								<Input v-model="newOwnerAddress" placeholder="0x..." :disabled="isLoading" />
							</div>

							<div class="space-y-4 p-4">
								<div class="flex gap-2">
									<!-- Cancel -->
									<Button
										variant="outline"
										@click="onClickCancelRecovery"
										:loading="isLoadingCancelRecovery"
										:disabled="isLoading"
										class="flex-1"
									>
										Cancel Recovery
									</Button>

									<!-- Complete -->
									<Button
										v-if="canCompleteRecovery"
										@click="onClickCompleteRecovery"
										:loading="isLoadingCompleteRecovery"
										:disabled="isLoading"
										class="flex-1"
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
