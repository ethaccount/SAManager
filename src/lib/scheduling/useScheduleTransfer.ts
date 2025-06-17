import { getEncodedInstallScheduledTransfers, getEncodedInstallSmartSession } from '@/lib/module-management/module'
import { createScheduledTransferSession, getScheduledTransferSessionStatus } from '@/lib/permissions/session'
import { useSessionList } from '@/lib/permissions/useSessionList'
import { registerJob } from '@/lib/scheduling/registerJob'
import { getToken, NATIVE_TOKEN_ADDRESS, TokenTransfer } from '@/lib/token'
import { AccountId } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useTxModal } from '@/stores/useTxModal'
import { DateValue, getLocalTimeZone } from '@internationalized/date'
import { concat, parseEther, toBeHex, ZeroAddress } from 'ethers'
import {
	abiEncode,
	ADDRESS,
	ERC7579_MODULE_TYPE,
	Execution,
	getEncodedFunctionParams,
	INTERFACES,
	isSameAddress,
	RHINESTONE_ATTESTER_ADDRESS,
	SMART_SESSIONS_ENABLE_MODE,
	TIERC7579Account__factory,
	TRegistry__factory,
	TScheduledTransfers__factory,
	zeroPadLeft,
} from 'sendop'
import { SessionStruct } from 'sendop/dist/src/contract-types/TSmartSession'

export type ScheduleTransfer = TokenTransfer & {
	frequency: string
	times: number
	startDate: DateValue
}

type ModuleStatus = {
	isSmartSessionInstalled: boolean
	isScheduledTransfersInstalled: boolean
	isSessionExist: boolean
	isRhinestoneAttesterTrusted: boolean
	permissionId: string | null
}

type ScheduleTransferConfig = {
	recipient: string
	amount: bigint
	tokenAddress: string
	executeInterval: number
	numOfExecutions: number
	startDate: number
}

export function useScheduleTransfer() {
	const isLoadingReview = ref(false)
	const errorReview = ref<string | null>(null)

	const frequencyToSeconds: Record<string, number> = {
		'3min': 3 * 60,
		daily: 24 * 60 * 60,
		weekly: 7 * 24 * 60 * 60,
		monthly: 30 * 24 * 60 * 60,
	}

	function createScheduledTransfersInitData({
		executeInterval,
		numOfExecutions,
		startDate,
		recipient,
		tokenAddress,
		amount,
	}: ScheduleTransferConfig) {
		let tokenAddressToUse = tokenAddress

		// ScheduledTransfers.executeOrder use zero address for native token
		if (isSameAddress(tokenAddress, NATIVE_TOKEN_ADDRESS)) {
			tokenAddressToUse = ZeroAddress
		}

		// initData: executeInterval (6) ++ numOfExecutions (2) ++ startDate (6) ++ executionData
		return concat([
			zeroPadLeft(toBeHex(executeInterval), 6),
			zeroPadLeft(toBeHex(numOfExecutions), 2),
			zeroPadLeft(toBeHex(startDate), 6),
			abiEncode(['address', 'address', 'uint256'], [recipient, tokenAddressToUse, amount]),
		])
	}

	async function validateAccount() {
		const { isModular, selectedAccount } = useAccount()

		if (!selectedAccount.value) {
			throw new Error('No account selected')
		}

		if (!isModular.value) {
			throw new Error('Account is not modular')
		}

		return selectedAccount.value
	}

	async function checkModuleStatus(accountAddress: string): Promise<ModuleStatus> {
		const { client } = useBlockchain()
		const account = TIERC7579Account__factory.connect(accountAddress, client.value)

		// Check if SmartSession module is installed
		const isSmartSessionInstalled = await account.isModuleInstalled(
			ERC7579_MODULE_TYPE.VALIDATOR,
			ADDRESS.SmartSession,
			'0x',
		)

		// Check if ScheduledTransfers module is installed
		const isScheduledTransfersInstalled = await account.isModuleInstalled(
			ERC7579_MODULE_TYPE.EXECUTOR,
			ADDRESS.ScheduledTransfers,
			'0x',
		)

		// Check if session exists for scheduled transfers
		let isSessionExist = false
		let permissionId: string | null = null

		if (isSmartSessionInstalled) {
			const { sessions, loadSessions } = useSessionList()
			await loadSessions(accountAddress)

			for (const session of sessions.value) {
				const status = getScheduledTransferSessionStatus(session)
				if (status.isActionEnabled && status.isPermissionEnabled) {
					isSessionExist = true
					permissionId = session.permissionId
					break
				}
			}
		}

		// Check if Rhinestone Attester is trusted (for Kernel accounts)
		const { selectedAccount } = useAccount()
		const isRhinestoneAttesterTrusted = selectedAccount.value?.accountId !== 'kernel.advanced.v0.3.1'

		return {
			isSmartSessionInstalled,
			isScheduledTransfersInstalled,
			isSessionExist,
			isRhinestoneAttesterTrusted,
			permissionId,
		}
	}

	function buildSmartSessionExecutions(
		moduleStatus: ModuleStatus,
		accountId: AccountId,
	): { executions: Execution[]; permissionId: string } {
		const executions: Execution[] = []
		let permissionId = moduleStatus.permissionId

		if (!permissionId) {
			const { session, permissionId: newPermissionId } = createScheduledTransferSession()
			permissionId = newPermissionId

			const sessions: SessionStruct[] = [session]

			if (moduleStatus.isSmartSessionInstalled) {
				if (!moduleStatus.isSessionExist) {
					// Create a new session
					executions.push({
						to: ADDRESS.SmartSession,
						value: 0n,
						data: INTERFACES.SmartSession.encodeFunctionData('enableSessions', [sessions]),
					})
					console.log('SmartSession installed, but no session for scheduledTransfer, create a new session')
				}
			} else {
				// Install smart session module and enable the session
				const encodedSessions = getEncodedFunctionParams(
					INTERFACES.SmartSession.encodeFunctionData('enableSessions', [sessions]),
				)
				const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

				executions.push({
					to: useAccount().selectedAccount.value!.address,
					value: 0n,
					data: getEncodedInstallSmartSession(accountId, smartSessionInitData),
				})
				console.log('SmartSession not installed, install and enable the session')
			}
		}

		return { executions, permissionId }
	}

	function buildScheduledTransfersExecutions(
		moduleStatus: ModuleStatus,
		accountId: AccountId,
		scheduledTransfersInitData: string,
	): Execution[] {
		const executions: Execution[] = []

		if (moduleStatus.isScheduledTransfersInstalled) {
			// Add a order
			executions.push({
				to: ADDRESS.ScheduledTransfers,
				value: 0n,
				data: INTERFACES.ScheduledTransfers.encodeFunctionData('addOrder', [scheduledTransfersInitData]),
			})
			console.log('ScheduledTransfers installed, add a order')
		} else {
			// Install scheduled transfers module and create a job
			executions.push({
				to: useAccount().selectedAccount.value!.address,
				value: 0n,
				data: getEncodedInstallScheduledTransfers(accountId, scheduledTransfersInitData),
			})
			console.log('ScheduledTransfers not installed, install and add a order')
		}

		return executions
	}

	function buildRhinestoneAttesterExecutions(moduleStatus: ModuleStatus): Execution[] {
		if (moduleStatus.isRhinestoneAttesterTrusted) {
			return []
		}

		console.log('Rhinestone Attester not trusted, trust it')
		return [
			{
				to: ADDRESS.Registry,
				value: 0n,
				data: TRegistry__factory.createInterface().encodeFunctionData('trustAttesters', [
					1,
					[RHINESTONE_ATTESTER_ADDRESS],
				]),
			},
		]
	}

	function createScheduleTransferConfig(scheduledTransfer: ScheduleTransfer): ScheduleTransferConfig {
		const { selectedChainId } = useBlockchain()
		const token = getToken(selectedChainId.value, scheduledTransfer.tokenAddress)

		return {
			recipient: scheduledTransfer.recipient,
			amount: parseEther(scheduledTransfer.amount),
			tokenAddress: token?.address || '',
			executeInterval: frequencyToSeconds[scheduledTransfer.frequency] || 0,
			numOfExecutions: scheduledTransfer.times,
			startDate: Math.floor(scheduledTransfer.startDate.toDate(getLocalTimeZone()).getTime() / 1000),
		}
	}

	async function getJobId(accountAddress: string): Promise<bigint> {
		const { client } = useBlockchain()
		const scheduledTransfers = TScheduledTransfers__factory.connect(ADDRESS.ScheduledTransfers, client.value)
		const jobCount = await scheduledTransfers.accountJobCount(accountAddress)
		return jobCount + 1n
	}

	async function reviewScheduleTransfer(scheduledTransfer: ScheduleTransfer) {
		try {
			errorReview.value = null
			isLoadingReview.value = true

			// Step 1: Validate account
			const selectedAccount = await validateAccount()

			// Step 2: Check module and session status
			const moduleStatus = await checkModuleStatus(selectedAccount.address)

			// Step 3: Build SmartSession executions
			const { executions: smartSessionExecutions, permissionId } = buildSmartSessionExecutions(
				moduleStatus,
				selectedAccount.accountId,
			)

			// Step 4: Create schedule transfer configuration
			const config = createScheduleTransferConfig(scheduledTransfer)
			const scheduledTransfersInitData = createScheduledTransfersInitData(config)

			// Step 5: Build ScheduledTransfers executions
			const scheduledTransfersExecutions = buildScheduledTransfersExecutions(
				moduleStatus,
				selectedAccount.accountId,
				scheduledTransfersInitData,
			)

			// Step 6: Build Rhinestone Attester executions (for Kernel accounts)
			const rhinestoneExecutions = buildRhinestoneAttesterExecutions(moduleStatus)

			// Step 7: Combine all executions
			const executions: Execution[] = [
				...rhinestoneExecutions,
				...smartSessionExecutions,
				...scheduledTransfersExecutions,
			]

			// Step 8: Get job ID and open transaction modal
			const jobId = await getJobId(selectedAccount.address)

			useTxModal().openModal({
				executions,
				async onSuccess() {
					const { bundler, client } = useBlockchain()

					if (!selectedAccount) {
						throw new Error('No account selected')
					}

					try {
						await registerJob({
							accountId: selectedAccount.accountId,
							accountAddress: selectedAccount.address,
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
		} catch (error) {
			errorReview.value = error instanceof Error ? error.message : String(error)
		} finally {
			isLoadingReview.value = false
		}
	}

	return {
		isLoadingReview,
		errorReview,
		reviewScheduleTransfer,
	}
}
