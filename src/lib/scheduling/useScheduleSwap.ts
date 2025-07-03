import { getInstallModuleData } from '@/lib/module-management/calldata'
import { createScheduledSwapSession, getScheduledSwapSessionStatus } from '@/lib/permissions/session'
import { useSessionList } from '@/lib/permissions/useSessionList'
import {
	BaseModuleStatus,
	buildRhinestoneAttesterExecutions,
	checkBaseModuleStatus,
	frequencyToSeconds,
	validateAccount,
} from '@/lib/scheduling/common'
import { registerJob } from '@/lib/scheduling/registerJob'
import { getToken } from '@/lib/token'
import { useGetCode } from '@/lib/useGetCode'
import { AccountId, ImportedAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { TxModalExecution, useTxModal } from '@/stores/useTxModal'
import { DateValue, getLocalTimeZone } from '@internationalized/date'
import { concat, parseUnits, toBeHex } from 'ethers'
import {
	abiEncode,
	ADDRESS,
	ERC7579_MODULE_TYPE,
	ERC7579Module,
	getEncodedFunctionParams,
	INTERFACES,
	SMART_SESSIONS_ENABLE_MODE,
	TIERC7579Account__factory,
	TScheduledOrders__factory,
	zeroPadLeft,
} from 'sendop'
import { SessionStruct } from 'sendop/dist/src/contract-types/TSmartSession'
import { DEFAULT_FEE, DEFAULT_SLIPPAGE, SWAP_ROUTER } from './swap-utils'

export type ScheduleSwap = {
	tokenIn: string
	tokenOut: string
	amountIn: string
	frequency: string
	times: number
	startDate: DateValue
}

type ModuleStatus = BaseModuleStatus & {
	isScheduledOrdersInstalled: boolean
}

type ScheduleSwapConfig = {
	tokenIn: string
	tokenOut: string
	amountIn: bigint
	executeInterval: number
	numOfExecutions: number
	startDate: number
}

export function useScheduleSwap() {
	const { client, selectedChainId } = useBlockchain()

	const isLoadingReview = ref(false)
	const errorReview = ref<string | null>(null)

	function createScheduledOrdersOrderData({
		executeInterval,
		numOfExecutions,
		startDate,
		tokenIn,
		tokenOut,
		amountIn,
	}: ScheduleSwapConfig) {
		// orderData: executeInterval (6) ++ numOfExecutions (2) ++ startDate (6) ++ executionData
		return concat([
			zeroPadLeft(toBeHex(executeInterval), 6),
			zeroPadLeft(toBeHex(numOfExecutions), 2),
			zeroPadLeft(toBeHex(startDate), 6),
			abiEncode(['address', 'address', 'uint256'], [tokenIn, tokenOut, amountIn]),
		])
	}

	async function checkModuleStatus(importedAccount: ImportedAccount): Promise<ModuleStatus> {
		const { isDeployed, getCode } = useGetCode()

		await getCode(importedAccount.address)

		const baseStatus = await checkBaseModuleStatus(client.value, importedAccount, isDeployed.value)

		let isScheduledOrdersInstalled = false
		let isSessionExist = false
		let permissionId: string | null = null

		if (isDeployed.value) {
			const account = TIERC7579Account__factory.connect(importedAccount.address, client.value)

			// Check if ScheduledOrders module is installed
			isScheduledOrdersInstalled = await account.isModuleInstalled(
				ERC7579_MODULE_TYPE.EXECUTOR,
				ADDRESS.ScheduledOrders,
				'0x',
			)

			// Check if session exists for scheduled swaps
			if (baseStatus.isSmartSessionInstalled) {
				const { sessions, loadSessions } = useSessionList()
				await loadSessions(importedAccount.address)

				for (const session of sessions.value) {
					const status = getScheduledSwapSessionStatus(session)
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
			isScheduledOrdersInstalled,
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
			const { session, permissionId: newPermissionId } = createScheduledSwapSession()
			permissionId = newPermissionId

			const sessions: SessionStruct[] = [session]

			if (moduleStatus.isSmartSessionInstalled) {
				if (!moduleStatus.isSessionExist) {
					// Create a new session
					executions.push({
						to: ADDRESS.SmartSession,
						value: 0n,
						data: INTERFACES.SmartSession.encodeFunctionData('enableSessions', [sessions]),
						description: 'Enable the session for scheduled swaps',
					})
				}
			} else {
				// Install smart session module and enable the session
				const encodedSessions = getEncodedFunctionParams(
					INTERFACES.SmartSession.encodeFunctionData('enableSessions', [sessions]),
				)
				const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

				const smartSession: ERC7579Module = {
					type: ERC7579_MODULE_TYPE.VALIDATOR,
					address: ADDRESS.SmartSession,
					initData: smartSessionInitData,
					deInitData: '0x',
				}

				executions.push({
					to: importedAccount.address,
					value: 0n,
					data: getInstallModuleData(importedAccount.accountId, smartSession),
					description: 'Install SmartSession module and enable the session',
				})
			}
		}

		return { executions, permissionId }
	}

	function buildScheduledOrdersExecutions(
		moduleStatus: ModuleStatus,
		accountId: AccountId,
		scheduledOrdersOrderData: string,
	): TxModalExecution[] {
		const executions: TxModalExecution[] = []

		if (moduleStatus.isScheduledOrdersInstalled) {
			// Add a order
			executions.push({
				to: ADDRESS.ScheduledOrders,
				value: 0n,
				data: INTERFACES.ScheduledOrders.encodeFunctionData('addOrder', [scheduledOrdersOrderData]),
				description: 'Add a order to ScheduledOrders',
			})
		} else {
			// Install scheduled orders module and create a job
			const scheduledOrders: ERC7579Module = {
				type: ERC7579_MODULE_TYPE.EXECUTOR,
				address: ADDRESS.ScheduledOrders,
				// Note that the order data should be prefixed with the SWAP_ROUTER address when installing the module
				initData: concat([SWAP_ROUTER, scheduledOrdersOrderData]),
				deInitData: '0x',
			}

			executions.push({
				to: useAccount().selectedAccount.value!.address,
				value: 0n,
				data: getInstallModuleData(accountId, scheduledOrders),
				description: 'Install ScheduledOrders and add a order',
			})
		}

		return executions
	}

	function createScheduleSwapConfig(scheduledSwap: ScheduleSwap): ScheduleSwapConfig {
		const { selectedChainId } = useBlockchain()
		const tokenIn = getToken(selectedChainId.value, scheduledSwap.tokenIn)
		const tokenOut = getToken(selectedChainId.value, scheduledSwap.tokenOut)

		if (!tokenIn || !tokenOut) {
			throw new Error('createScheduleSwapConfig: Token information not found')
		}

		return {
			tokenIn: tokenIn.address,
			tokenOut: tokenOut.address,
			amountIn: parseUnits(scheduledSwap.amountIn, tokenIn.decimals),
			executeInterval: frequencyToSeconds[scheduledSwap.frequency] || 0,
			numOfExecutions: scheduledSwap.times,
			startDate: Math.floor(scheduledSwap.startDate.toDate(getLocalTimeZone()).getTime() / 1000),
		}
	}

	async function getJobId(accountAddress: string): Promise<bigint> {
		const { client } = useBlockchain()
		const scheduledOrders = TScheduledOrders__factory.connect(ADDRESS.ScheduledOrders, client.value)
		const jobCount = await scheduledOrders.accountJobCount(accountAddress)
		return jobCount + 1n
	}

	async function reviewScheduleSwap(scheduledSwap: ScheduleSwap) {
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

			// Step 4: Create schedule swap configuration
			const config = createScheduleSwapConfig(scheduledSwap)
			const scheduledOrdersOrderData = createScheduledOrdersOrderData(config)

			// Step 5: Build ScheduledOrders executions
			const scheduledOrdersExecutions = buildScheduledOrdersExecutions(
				moduleStatus,
				selectedAccount.accountId,
				scheduledOrdersOrderData,
			)

			// Step 6: Build Rhinestone Attester executions (for Kernel accounts)
			const rhinestoneExecutions = buildRhinestoneAttesterExecutions(moduleStatus.isRhinestoneAttesterTrusted)

			// Step 7: Combine all executions
			const executions: TxModalExecution[] = [
				...rhinestoneExecutions,
				...smartSessionExecutions,
				...scheduledOrdersExecutions,
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
							jobType: 'swap',
							swapParams: {
								tokenIn: config.tokenIn,
								tokenOut: config.tokenOut,
								amountIn: config.amountIn,
								slippageTolerance: DEFAULT_SLIPPAGE,
								fee: DEFAULT_FEE,
							},
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
		reviewScheduleSwap,
	}
}
