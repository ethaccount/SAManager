import { getEncodedInstallScheduledTransfers, getEncodedInstallSmartSession } from '@/lib/module-management/module'
import { createScheduledTransferSession, getScheduledTransferSessionStatus } from '@/lib/permissions/session'
import { useSessionList } from '@/lib/permissions/useSessionList'
import {
	BaseModuleStatus,
	buildRhinestoneAttesterExecutions,
	checkBaseModuleStatus,
	frequencyToSeconds,
	validateAccount,
} from '@/lib/scheduling/common'
import { registerJob } from '@/lib/scheduling/registerJob'
import { getToken, NATIVE_TOKEN_ADDRESS, TokenTransfer } from '@/lib/token'
import { AccountId, ImportedAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { TxModalExecution, useTxModal } from '@/stores/useTxModal'
import { DateValue, getLocalTimeZone } from '@internationalized/date'
import { concat, parseUnits, toBeHex, ZeroAddress } from 'ethers'
import {
	abiEncode,
	ADDRESS,
	ERC7579_MODULE_TYPE,
	getEncodedFunctionParams,
	INTERFACES,
	isSameAddress,
	SMART_SESSIONS_ENABLE_MODE,
	TIERC7579Account__factory,
	TScheduledTransfers__factory,
	zeroPadLeft,
} from 'sendop'
import { SessionStruct } from 'sendop/dist/src/contract-types/TSmartSession'
import { useGetCode } from '@/lib/useGetCode'

export type ScheduleTransfer = TokenTransfer & {
	frequency: string
	times: number
	startDate: DateValue
}

type ModuleStatus = BaseModuleStatus & {
	isScheduledTransfersInstalled: boolean
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
	const { client, selectedChainId } = useBlockchain()

	const isLoadingReview = ref(false)
	const errorReview = ref<string | null>(null)

	function createScheduledTransfersOrderData({
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

	async function checkModuleStatus(importedAccount: ImportedAccount): Promise<ModuleStatus> {
		const { isDeployed, getCode } = useGetCode()

		await getCode(importedAccount.address)

		const baseStatus = await checkBaseModuleStatus(client.value, importedAccount, isDeployed.value)

		let isScheduledTransfersInstalled = false
		let isSessionExist = false
		let permissionId: string | null = null

		if (isDeployed.value) {
			const account = TIERC7579Account__factory.connect(importedAccount.address, client.value)

			// Check if ScheduledTransfers module is installed
			isScheduledTransfersInstalled = await account.isModuleInstalled(
				ERC7579_MODULE_TYPE.EXECUTOR,
				ADDRESS.ScheduledTransfers,
				'0x',
			)

			// Check if session exists for scheduled transfers
			if (baseStatus.isSmartSessionInstalled) {
				const { sessions, loadSessions } = useSessionList()
				await loadSessions(importedAccount.address)

				for (const session of sessions.value) {
					const status = getScheduledTransferSessionStatus(session)
					if (status.isActionEnabled && status.isPermissionEnabled) {
						isSessionExist = true
						permissionId = session.permissionId
						break
					}
				}
			}
		}

		return {
			...baseStatus,
			isScheduledTransfersInstalled,
			isSessionExist,
			permissionId,
		}
	}

	function buildSmartSessionExecutions(
		moduleStatus: ModuleStatus,
		importedAccount: ImportedAccount,
	): { executions: TxModalExecution[]; permissionId: string } {
		const executions: TxModalExecution[] = []
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
						description: 'Enable the session for scheduled transfers',
					})
				}
			} else {
				// Install smart session module and enable the session
				const encodedSessions = getEncodedFunctionParams(
					INTERFACES.SmartSession.encodeFunctionData('enableSessions', [sessions]),
				)
				const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

				executions.push({
					to: importedAccount.address,
					value: 0n,
					data: getEncodedInstallSmartSession(importedAccount.accountId, smartSessionInitData),
					description: 'Install SmartSession module and enable the session',
				})
			}
		}

		return { executions, permissionId }
	}

	function buildScheduledTransfersExecutions(
		moduleStatus: ModuleStatus,
		accountId: AccountId,
		scheduledTransfersOrderData: string,
	): TxModalExecution[] {
		const executions: TxModalExecution[] = []

		if (moduleStatus.isScheduledTransfersInstalled) {
			// Add a order
			executions.push({
				to: ADDRESS.ScheduledTransfers,
				value: 0n,
				data: INTERFACES.ScheduledTransfers.encodeFunctionData('addOrder', [scheduledTransfersOrderData]),
				description: 'Add a order to ScheduledTransfers',
			})
		} else {
			const { selectedAccount } = useAccount()
			// Install scheduled transfers module and create a job
			executions.push({
				to: selectedAccount.value!.address,
				value: 0n,
				data: getEncodedInstallScheduledTransfers(accountId, scheduledTransfersOrderData),
				description: 'Install ScheduledTransfers and add a order',
			})
		}

		return executions
	}

	function createScheduleTransferConfig(scheduledTransfer: ScheduleTransfer): ScheduleTransferConfig {
		const { selectedChainId } = useBlockchain()
		const token = getToken(selectedChainId.value, scheduledTransfer.tokenAddress)

		if (!token) {
			throw new Error('createScheduleTransferConfig: Token information not found')
		}

		return {
			recipient: scheduledTransfer.recipient,
			amount: parseUnits(scheduledTransfer.amount, token.decimals),
			tokenAddress: token.address,
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
			const moduleStatus = await checkModuleStatus(selectedAccount)

			// Step 3: Build SmartSession executions
			const { executions: smartSessionExecutions, permissionId } = buildSmartSessionExecutions(
				moduleStatus,
				selectedAccount,
			)

			// Step 4: Create schedule transfer configuration
			const config = createScheduleTransferConfig(scheduledTransfer)
			const scheduledTransfersOrderData = createScheduledTransfersOrderData(config)

			// Step 5: Build ScheduledTransfers executions
			const scheduledTransfersExecutions = buildScheduledTransfersExecutions(
				moduleStatus,
				selectedAccount.accountId,
				scheduledTransfersOrderData,
			)

			// Step 6: Build Rhinestone Attester executions (for Kernel accounts)
			const rhinestoneExecutions = buildRhinestoneAttesterExecutions(moduleStatus.isRhinestoneAttesterTrusted)

			// Step 7: Combine all executions
			const executions: TxModalExecution[] = [
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
							chainId: selectedChainId.value,
							accountId: selectedAccount.accountId,
							accountAddress: selectedAccount.address,
							permissionId,
							jobId,
							client: client.value,
							bundler: bundler.value,
							jobType: 'transfer',
						})
					} catch (e: unknown) {
						const msg = 'Register job failed: ' + (e instanceof Error ? e.message : String(e))
						console.error(msg)
						throw new Error(msg)
					}
				},
			})
		} catch (error: unknown) {
			errorReview.value = error instanceof Error ? error.message : String(error)
			throw error
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
