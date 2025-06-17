<script setup lang="ts">
import { IS_DEV } from '@/config'
import { getEncodedInstallScheduledTransfers, getEncodedInstallSmartSession } from '@/lib/module-management/module'
import { createScheduledTransferSession, getScheduledTransferSessionStatus } from '@/lib/permissions/session'
import { useSessionList } from '@/lib/permissions/useSessionList'
import { registerJob } from '@/lib/scheduling/registerJob'
import { createScheduledTransfersInitData } from '@/lib/scheduling/scheduleTransfer'
import { ScheduleTransfer, getTokens, getToken, NATIVE_TOKEN_ADDRESS } from '@/lib/token'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useTxModal } from '@/stores/useTxModal'
import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import { concat, isAddress, parseEther } from 'ethers'
import { CalendarIcon } from 'lucide-vue-next'
import {
	ADDRESS,
	ERC7579_MODULE_TYPE,
	Execution,
	getEncodedFunctionParams,
	INTERFACES,
	RHINESTONE_ATTESTER_ADDRESS,
	SMART_SESSIONS_ENABLE_MODE,
	TIERC7579Account__factory,
	TRegistry__factory,
	TScheduledTransfers__factory,
} from 'sendop'
import { SessionStruct } from 'sendop/dist/src/contract-types/TSmartSession'

const { isAccountConnected } = useAccount()
const { selectedChainId } = useBlockchain()

const availableTokens = computed(() => getTokens(selectedChainId.value))

function getDefaultTransfer(): ScheduleTransfer {
	if (IS_DEV) {
		return {
			recipient: '0xd78B5013757Ea4A7841811eF770711e6248dC282',
			amount: '0.0001',
			tokenAddress: NATIVE_TOKEN_ADDRESS,
			frequency: '3min',
			times: 3,
			startDate: today(getLocalTimeZone()),
		}
	}
	return {
		recipient: '',
		amount: '0',
		tokenAddress: NATIVE_TOKEN_ADDRESS,
		frequency: 'weekly',
		times: 3,
		startDate: today(getLocalTimeZone()),
	}
}

const scheduledTransferInput = ref<ScheduleTransfer>(getDefaultTransfer())

const frequencies = computed(() => [
	...(IS_DEV ? [{ id: '3min', label: '3 min' }] : []),
	{ id: 'daily', label: 'Daily' },
	{ id: 'weekly', label: 'Weekly' },
	{ id: 'monthly', label: 'Monthly' },
])

const dateFormatter = new DateFormatter('en-US', {
	dateStyle: 'long',
})

const isValidTransfers = computed(() => {
	const recipient = scheduledTransferInput.value.recipient
	const amount = scheduledTransferInput.value.amount
	const times = scheduledTransferInput.value.times

	if (!isAddress(recipient)) return false
	if (amount === '') return false
	if (!Number.isFinite(Number(amount))) return false // note: Number.isFinite cannot check empty string
	if (Number(amount) <= 0) return false

	if (times === undefined) return false
	if (!Number.isInteger(times)) return false
	if (times < 1 || times > 10) return false

	return true
})

const reviewDisabled = computed(() => {
	return !isAccountConnected.value || !isValidTransfers.value
})

const scheduledTransfer = computed(() => {
	const frequencyToSeconds: Record<string, number> = {
		'3min': 3 * 60,
		daily: 24 * 60 * 60,
		weekly: 7 * 24 * 60 * 60,
		monthly: 30 * 24 * 60 * 60,
	}

	const token = getToken(selectedChainId.value, scheduledTransferInput.value.tokenAddress)

	return {
		recipient: scheduledTransferInput.value.recipient,
		amount: parseEther(scheduledTransferInput.value.amount),
		tokenAddress: token?.address || '',
		executeInterval: frequencyToSeconds[scheduledTransferInput.value.frequency] || 0,
		numOfExecutions: scheduledTransferInput.value.times,
		startDate: Math.floor(scheduledTransferInput.value.startDate.toDate(getLocalTimeZone()).getTime() / 1000),
	}
})

watchImmediate(scheduledTransfer, () => {
	console.log('scheduledTransfer', scheduledTransfer.value)
})

const reviewButtonText = computed(() => {
	if (!isAccountConnected.value) return 'Connect your account to review'
	if (!isValidTransfers.value) return 'Invalid scheduled transfer'
	if (errorReview.value) return errorReview.value
	return 'Review scheduled transfer'
})

const isLoadingReview = ref(false)
const errorReview = ref<string | null>(null)

async function onClickReview() {
	errorReview.value = null

	const { isModular, selectedAccount } = useAccount()
	const { client } = useBlockchain()

	if (!selectedAccount.value) {
		throw new Error('No account selected')
	}

	// check if the account is modular
	if (!isModular.value) {
		errorReview.value = 'Account is not modular'
		return
	}

	// fetch data to check if the account has the module and session

	let isRhinestoneAttesterTrusted = true
	let isSmartSessionInstalled = false
	let isScheduledTransfersInstalled = false
	let isSessionExist = false

	let permissionId: string | null = null

	try {
		isLoadingReview.value = true

		const account = TIERC7579Account__factory.connect(selectedAccount.value.address, client.value)

		// check if the account has SmartSession module
		isSmartSessionInstalled = await account.isModuleInstalled(
			ERC7579_MODULE_TYPE.VALIDATOR,
			ADDRESS.SmartSession,
			'0x',
		)

		if (isSmartSessionInstalled) {
			// check if the account has a session for scheduledTransfer
			const { sessions, loadSessions } = useSessionList()
			await loadSessions(selectedAccount.value.address)

			for (const session of sessions.value) {
				const status = getScheduledTransferSessionStatus(session)
				if (status.isActionEnabled && status.isPermissionEnabled) {
					isSessionExist = true
					permissionId = session.permissionId
					break
				}
			}
		}

		// check if the account has ScheduledTransfers module
		isScheduledTransfersInstalled = await account.isModuleInstalled(
			ERC7579_MODULE_TYPE.EXECUTOR,
			ADDRESS.ScheduledTransfers,
			'0x',
		)

		// if acccount type is Kernel, check if Rhinestone Attester is trusted
		if (selectedAccount.value.accountId === 'kernel.advanced.v0.3.1') {
			// TODO: check isRhinestoneAttesterTrusted for Kernel
			isRhinestoneAttesterTrusted = false
		}
	} catch (e: unknown) {
		console.error(e)
		throw e
	} finally {
		isLoadingReview.value = false
	}

	/*
		Logic flow:

		Is Smartsession installed?
			- Yes: Is there a session for scheduledTransfer?
				- Yes: get the permission id
				- No: create a new session
			- No: Install the module and enable it

		Is ScheduledTransfers installed?
			- Yes: add execution for addOrder
			- No: Install and enable it
	*/

	const executions: Execution[] = []

	if (!permissionId) {
		const { session, permissionId: newPermissionId } = createScheduledTransferSession()
		permissionId = newPermissionId

		const sessions: SessionStruct[] = [session]

		if (isSmartSessionInstalled) {
			if (!isSessionExist) {
				// create a new session
				executions.push({
					to: ADDRESS.SmartSession,
					value: 0n,
					data: INTERFACES.SmartSession.encodeFunctionData('enableSessions', [sessions]),
				})
				console.log('SmartSession installed, but no session for scheduledTransfer, create a new session')
			}
		} else {
			// install smart session module and enable the session
			const encodedSessions = getEncodedFunctionParams(
				INTERFACES.SmartSession.encodeFunctionData('enableSessions', [sessions]),
			)
			const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

			executions.push({
				to: selectedAccount.value.address,
				value: 0n,
				data: getEncodedInstallSmartSession(selectedAccount.value.accountId, smartSessionInitData),
			})
			console.log('SmartSession not installed, install and enable the session')
		}
	}

	// Is ScheduledTransfers installed?

	const scheduledTransfersInitData = createScheduledTransfersInitData(scheduledTransfer.value)

	if (isScheduledTransfersInstalled) {
		// add a order
		executions.push({
			to: ADDRESS.ScheduledTransfers,
			value: 0n,
			data: INTERFACES.ScheduledTransfers.encodeFunctionData('addOrder', [scheduledTransfersInitData]),
		})
		console.log('ScheduledTransfers installed, add a order')
	} else {
		// install scheduled transfers module and create a job
		executions.push({
			to: selectedAccount.value.address,
			value: 0n,
			data: getEncodedInstallScheduledTransfers(selectedAccount.value.accountId, scheduledTransfersInitData),
		})
		console.log('ScheduledTransfers not installed, install and add a order')
	}

	// only for kernel account
	if (!isRhinestoneAttesterTrusted) {
		executions.unshift({
			to: ADDRESS.Registry,
			value: 0n,
			data: TRegistry__factory.createInterface().encodeFunctionData('trustAttesters', [
				1,
				[RHINESTONE_ATTESTER_ADDRESS],
			]),
		})
		console.log('Rhinestone Attester not trusted, trust it')
	}

	// Get the job id for this scheduled transfer
	const scheduledTransfers = TScheduledTransfers__factory.connect(ADDRESS.ScheduledTransfers, client.value)
	const jobCount = await scheduledTransfers.accountJobCount(selectedAccount.value.address)
	const jobId = jobCount + 1n

	useTxModal().openModal({
		executions,
		async onSuccess() {
			const { bundler } = useBlockchain()

			if (!selectedAccount.value) {
				throw new Error('No account selected')
			}

			try {
				await registerJob({
					accountId: selectedAccount.value.accountId,
					accountAddress: selectedAccount.value.address,
					permissionId,
					jobId,
					client: client.value,
					bundler: bundler.value,
				})
			} catch (e: unknown) {
				const msg = 'Register job failed: ' + (e instanceof Error ? e.message : String(e))
				console.error(msg)
				throw new Error(msg)
			}
		},
	})
}
</script>

<template>
	<Card class="w-full bg-background/50 backdrop-blur-sm border-none shadow-none">
		<CardContent class="pt-4">
			<div class="mb-4">
				<Button
					class="w-full bg-primary/90 hover:bg-primary disabled:opacity-50"
					size="lg"
					@click="onClickReview"
					:disabled="reviewDisabled"
					:loading="isLoadingReview"
				>
					{{ reviewButtonText }}
				</Button>
			</div>

			<div class="space-y-3">
				<div
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
					<div class="space-y-3">
						<Input
							id="recipient"
							placeholder="Recipient Address (0x...)"
							v-model="scheduledTransferInput.recipient"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>

						<div class="grid grid-cols-3 gap-2">
							<div class="col-span-2">
								<Input
									id="amount"
									type="text"
									placeholder="0.0"
									v-model="scheduledTransferInput.amount"
									class="border-none bg-muted text-lg placeholder:text-muted-foreground/50"
								/>
							</div>
							<div>
								<Select v-model="scheduledTransferInput.tokenAddress">
									<SelectTrigger id="token" class="border-none bg-muted">
										<SelectValue>
											<template #placeholder>Token</template>
											<div class="flex items-center">
												<span class="mr-2 text-lg">{{
													getToken(selectedChainId, scheduledTransferInput.tokenAddress)?.icon
												}}</span>
												<span>{{
													getToken(selectedChainId, scheduledTransferInput.tokenAddress)
														?.symbol
												}}</span>
											</div>
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectItem
											v-for="token in availableTokens"
											:key="token.address"
											:value="token.address"
											class="cursor-pointer"
										>
											<div class="flex items-center">
												<span class="mr-2 text-lg">{{ token.icon }}</span>
												<span>{{ token.symbol }}</span>
											</div>
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</div>

				<!-- Frequency Section -->
				<div
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<h3 class="mb-2 text-sm font-medium">Frequency</h3>
							<Select v-model="scheduledTransferInput.frequency">
								<SelectTrigger id="frequency" class="border-none bg-muted">
									<SelectValue>
										<template #placeholder>Select frequency</template>
										{{ frequencies.find(f => f.id === scheduledTransferInput.frequency)?.label }}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectItem
										v-for="frequency in frequencies"
										:key="frequency.id"
										:value="frequency.id"
										class="cursor-pointer"
									>
										{{ frequency.label }}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<h3 class="mb-2 text-sm font-medium">Number of Times</h3>
							<Input
								id="times"
								type="number"
								min="1"
								max="10"
								v-model.number="scheduledTransferInput.times"
								class="border-none bg-muted"
							/>
						</div>
					</div>
				</div>

				<!-- Start Date Section -->
				<div
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
					<h3 class="mb-2 text-sm font-medium">Start Date</h3>
					<Popover>
						<PopoverTrigger class="w-full">
							<Button
								variant="outline"
								class="w-full justify-start text-left font-normal border-none bg-muted"
							>
								<CalendarIcon class="mr-2 h-4 w-4" />
								{{
									scheduledTransferInput.startDate
										? dateFormatter.format(
												scheduledTransferInput.startDate.toDate(getLocalTimeZone()),
										  )
										: 'Pick a date'
								}}
							</Button>
						</PopoverTrigger>
						<PopoverContent class="w-auto p-0">
							<Calendar v-model="scheduledTransferInput.startDate as DateValue" />
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped></style>
