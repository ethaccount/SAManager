<script setup lang="ts">
import { IS_DEV } from '@/config'
import { ScheduleTransfer, tokens } from '@/lib/token'
import { AccountId } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useTxModal } from '@/stores/useTxModal'
import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import { concat, isAddress, parseEther, toBeHex } from 'ethers'
import { CalendarIcon } from 'lucide-vue-next'
import {
	abiEncode,
	ADDRESS,
	ERC7579_MODULE_TYPE,
	Execution,
	getEncodedFunctionParams,
	getPermissionId,
	INTERFACES,
	KernelV3Account,
	NexusAccount,
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579Account,
	SMART_SESSIONS_ENABLE_MODE,
	TIERC7579Account__factory,
	TRegistry__factory,
	TSmartSession__factory,
	zeroPadLeft,
} from 'sendop'
import { SessionStruct } from 'sendop/dist/src/contract-types/TSmartSession'

const { isAccountConnected } = useAccount()

function getDefaultTransfer(): ScheduleTransfer {
	if (IS_DEV) {
		return {
			recipient: '0xd78B5013757Ea4A7841811eF770711e6248dC282',
			amount: '0.0001',
			tokenId: tokens[0].id,
			frequency: '3min',
			times: 3,
			startDate: today(getLocalTimeZone()),
		}
	}
	return {
		recipient: '',
		amount: '0',
		tokenId: tokens[0].id,
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

	const token = tokens.find(t => t.id === scheduledTransferInput.value.tokenId)

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

	let isRhinestoneAttesterTrusted = true
	let isSmartSessionInstalled = false
	let isScheduledTransfersInstalled = false

	try {
		isLoadingReview.value = true

		const account = TIERC7579Account__factory.connect(selectedAccount.value.address, client.value)

		// check if the account has SmartSession module
		isSmartSessionInstalled = await account.isModuleInstalled(
			ERC7579_MODULE_TYPE.VALIDATOR,
			ADDRESS.SmartSession,
			'0x',
		)

		// check if the account has ScheduledTransfers module
		isScheduledTransfersInstalled = await account.isModuleInstalled(
			ERC7579_MODULE_TYPE.EXECUTOR,
			ADDRESS.ScheduledTransfers,
			'0x',
		)

		// if acccount type is Kernel, check if Rhinestone Attester is trusted
		if (selectedAccount.value.accountId === 'kernel.advanced.v0.3.1') {
			// TODO: check
			isRhinestoneAttesterTrusted = false
		}
	} catch (e: unknown) {
		console.error(e)
		throw e
	} finally {
		isLoadingReview.value = false
	}

	// @TODO: impl it later
	if (isSmartSessionInstalled || isScheduledTransfersInstalled) {
		throw new Error('Account already have SmartSession or ScheduledTransfers module')
	}

	// create smartsession init data
	const SESSION_SIGNER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' // acc1

	const session: SessionStruct = {
		sessionValidator: ADDRESS.OwnableValidator,
		sessionValidatorInitData: abiEncode(['uint256', 'address[]'], [1, [SESSION_SIGNER_ADDRESS]]), // threshold, signers
		salt: zeroPadLeft(toBeHex(1), 32),
		userOpPolicies: [
			{
				policy: ADDRESS.SudoPolicy,
				initData: '0x',
			},
		],
		erc7739Policies: {
			erc1271Policies: [],
			allowedERC7739Content: [],
		},
		actions: [
			{
				actionTargetSelector: INTERFACES.ScheduledTransfers.getFunction('executeOrder').selector,
				actionTarget: ADDRESS.ScheduledTransfers,
				actionPolicies: [
					{
						policy: ADDRESS.SudoPolicy,
						initData: '0x',
					},
				],
			},
		],
		permitERC4337Paymaster: true,
	}
	const permissionId = getPermissionId(session)

	const sessions: SessionStruct[] = [session]
	const encodedSessions = getEncodedFunctionParams(
		TSmartSession__factory.createInterface().encodeFunctionData('enableSessions', [sessions]),
	)

	const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

	// create scheduled transfers init data
	const executeInterval = scheduledTransfer.value.executeInterval
	const numOfExecutions = scheduledTransfer.value.numOfExecutions
	const startDate = scheduledTransfer.value.startDate
	const recipient = scheduledTransfer.value.recipient
	const tokenAddress = scheduledTransfer.value.tokenAddress
	const amount = scheduledTransfer.value.amount

	// initData: executeInterval (6) ++ numOfExecutions (2) ++ startDate (6) ++ executionData
	const scheduledTransfersInitData = concat([
		zeroPadLeft(toBeHex(executeInterval), 6),
		zeroPadLeft(toBeHex(numOfExecutions), 2),
		zeroPadLeft(toBeHex(startDate), 6),
		abiEncode(['address', 'address', 'uint256'], [recipient, tokenAddress, amount]),
	])

	// construct the execution
	const executions: Execution[] = [
		// install smart session module and enable the session
		{
			to: selectedAccount.value.address,
			value: 0n,
			data: getEncodedInstallSmartSession(selectedAccount.value.accountId, smartSessionInitData),
		},
		// install scheduled transfers module and create a job
		{
			to: selectedAccount.value.address,
			value: 0n,
			data: getEncodedInstallScheduledTransfers(selectedAccount.value.accountId, scheduledTransfersInitData),
		},
	]

	if (!isRhinestoneAttesterTrusted) {
		executions.unshift({
			to: ADDRESS.Registry,
			value: 0n,
			data: TRegistry__factory.createInterface().encodeFunctionData('trustAttesters', [
				1,
				[RHINESTONE_ATTESTER_ADDRESS],
			]),
		})
	}

	useTxModal().openModal({
		executions,
	})
}

function getEncodedInstallSmartSession(accountId: AccountId, initData: string) {
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return KernelV3Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
				moduleAddress: ADDRESS.SmartSession,
				initData,
				selectorData: INTERFACES.KernelV3.getFunction('execute').selector,
			})
		case AccountId['biconomy.nexus.1.0.2']:
			return NexusAccount.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
				moduleAddress: ADDRESS.SmartSession,
				initData,
			})
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return Safe7579Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
				moduleAddress: ADDRESS.SmartSession,
				initData,
			})
		default:
			throw new Error(`getEncodedInstallSmartSession: Unsupported account for install: ${accountId}`)
	}
}

function getEncodedInstallScheduledTransfers(accountId: AccountId, initData: string) {
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return KernelV3Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledTransfers,
				initData,
			})
		case AccountId['biconomy.nexus.1.0.2']:
			return NexusAccount.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledTransfers,
				initData,
			})
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return Safe7579Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledTransfers,
				initData,
			})
		default:
			throw new Error(`getEncodedInstallScheduledTransfers: Unsupported account for install: ${accountId}`)
	}
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
								<Select v-model="scheduledTransferInput.tokenId">
									<SelectTrigger id="token" class="border-none bg-muted">
										<SelectValue>
											<template #placeholder>Token</template>
											<div class="flex items-center">
												<span class="mr-2 text-lg">{{
													tokens.find(t => t.id === scheduledTransferInput.tokenId)?.icon
												}}</span>
												<span>{{
													tokens.find(t => t.id === scheduledTransferInput.tokenId)?.symbol
												}}</span>
											</div>
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectItem
											v-for="token in tokens"
											:key="token.id"
											:value="token.id"
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
