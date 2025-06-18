import { getEncodedInstallScheduledOrders, getEncodedInstallSmartSession } from '@/lib/module-management/module'
import { createScheduledSwapSession, getScheduledSwapSessionStatus } from '@/lib/permissions/session'
import { useSessionList } from '@/lib/permissions/useSessionList'
import { registerJob } from '@/lib/scheduling/registerJob'
import {
	validateAccount,
	checkBaseModuleStatus,
	buildRhinestoneAttesterExecutions,
	frequencyToSeconds,
	BaseModuleStatus,
} from '@/lib/scheduling/common'
import { getToken } from '@/lib/token'
import { AccountId } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useTxModal } from '@/stores/useTxModal'
import { DateValue, getLocalTimeZone } from '@internationalized/date'
import { concat, parseEther, toBeHex } from 'ethers'
import {
	abiEncode,
	ADDRESS,
	ERC7579_MODULE_TYPE,
	Execution,
	getEncodedFunctionParams,
	INTERFACES,
	SMART_SESSIONS_ENABLE_MODE,
	TIERC7579Account__factory,
	TScheduledOrders__factory,
	zeroPadLeft,
} from 'sendop'
import { SessionStruct } from 'sendop/dist/src/contract-types/TSmartSession'

const SWAP_ROUTER = '0x65669fE35312947050C450Bd5d36e6361F85eC12'

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
	const isLoadingReview = ref(false)
	const errorReview = ref<string | null>(null)

	function createScheduledOrdersInitData({
		executeInterval,
		numOfExecutions,
		startDate,
		tokenIn,
		tokenOut,
		amountIn,
	}: ScheduleSwapConfig) {
		// initData: SWAP_ROUTER (20) ++ executeInterval (6) ++ numOfExecutions (2) ++ startDate (6) ++ executionData
		return concat([
			SWAP_ROUTER,
			zeroPadLeft(toBeHex(executeInterval), 6),
			zeroPadLeft(toBeHex(numOfExecutions), 2),
			zeroPadLeft(toBeHex(startDate), 6),
			abiEncode(['address', 'address', 'uint256'], [tokenIn, tokenOut, amountIn]),
		])
	}

	async function checkModuleStatus(accountAddress: string): Promise<ModuleStatus> {
		const { client } = useBlockchain()

		const baseStatus = await checkBaseModuleStatus(client.value, accountAddress)

		const account = TIERC7579Account__factory.connect(accountAddress, client.value)

		// Check if ScheduledOrders module is installed
		const isScheduledOrdersInstalled = await account.isModuleInstalled(
			ERC7579_MODULE_TYPE.EXECUTOR,
			ADDRESS.ScheduledOrders,
			'0x',
		)

		// Check if session exists for scheduled swaps
		let isSessionExist = false
		let permissionId: string | null = null

		if (baseStatus.isSmartSessionInstalled) {
			const { sessions, loadSessions } = useSessionList()
			await loadSessions(accountAddress)

			for (const session of sessions.value) {
				const status = getScheduledSwapSessionStatus(session)
				if (status.isActionEnabled && status.isPermissionEnabled) {
					isSessionExist = true
					permissionId = session.permissionId
					break
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
		accountId: AccountId,
	): { executions: Execution[]; permissionId: string } {
		const executions: Execution[] = []
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
					})
					console.log('SmartSession installed, but no session for scheduledSwap, create a new session')
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

	function buildScheduledOrdersExecutions(
		moduleStatus: ModuleStatus,
		accountId: AccountId,
		scheduledOrdersInitData: string,
	): Execution[] {
		const executions: Execution[] = []

		if (moduleStatus.isScheduledOrdersInstalled) {
			// Add a order
			executions.push({
				to: ADDRESS.ScheduledOrders,
				value: 0n,
				data: INTERFACES.ScheduledOrders.encodeFunctionData('addOrder', [scheduledOrdersInitData]),
			})
			console.log('ScheduledOrders installed, add a order')
		} else {
			// Install scheduled orders module and create a job
			executions.push({
				to: useAccount().selectedAccount.value!.address,
				value: 0n,
				data: getEncodedInstallScheduledOrders(accountId, scheduledOrdersInitData),
			})
			console.log('ScheduledOrders not installed, install and add a order')
		}

		return executions
	}

	function createScheduleSwapConfig(scheduledSwap: ScheduleSwap): ScheduleSwapConfig {
		const { selectedChainId } = useBlockchain()
		const tokenIn = getToken(selectedChainId.value, scheduledSwap.tokenIn)
		const tokenOut = getToken(selectedChainId.value, scheduledSwap.tokenOut)

		return {
			tokenIn: tokenIn?.address || '',
			tokenOut: tokenOut?.address || '',
			amountIn: parseEther(scheduledSwap.amountIn),
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
			const moduleStatus = await checkModuleStatus(selectedAccount.address)

			// Step 3: Build SmartSession executions
			const { executions: smartSessionExecutions, permissionId } = buildSmartSessionExecutions(
				moduleStatus,
				selectedAccount.accountId,
			)

			// Step 4: Create schedule swap configuration
			const config = createScheduleSwapConfig(scheduledSwap)
			const scheduledOrdersInitData = createScheduledOrdersInitData(config)

			// Step 5: Build ScheduledOrders executions
			const scheduledOrdersExecutions = buildScheduledOrdersExecutions(
				moduleStatus,
				selectedAccount.accountId,
				scheduledOrdersInitData,
			)

			// Step 6: Build Rhinestone Attester executions (for Kernel accounts)
			const rhinestoneExecutions = buildRhinestoneAttesterExecutions(moduleStatus.isRhinestoneAttesterTrusted)

			// Step 7: Combine all executions
			const executions: Execution[] = [
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
								// You can customize these parameters based on your requirements
								token0Decimals: 6, // USDC decimals
								token1Decimals: 18, // WETH decimals
								// zeroForOne will be calculated dynamically based on tokenIn address
								slippageTolerance: 0.005, // 0.5%
								fee: 500n, // Pool fee
							},
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
		reviewScheduleSwap,
	}
}
