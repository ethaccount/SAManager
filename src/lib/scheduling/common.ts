import { IS_DEV } from '@/config'
import { useAccount } from '@/stores/account/useAccount'
import { useBackend } from '@/stores/useBackend'
import { TxModalExecution } from '@/stores/useTxModal'
import { JsonRpcApiProvider } from 'ethers'
import {
	ADDRESS,
	ERC7579_MODULE_TYPE,
	Execution,
	RHINESTONE_ATTESTER_ADDRESS,
	TIERC7579Account__factory,
	TRegistry__factory,
} from 'sendop'

export const frequencyToSeconds: Record<string, number> = {
	'3min': 3 * 60,
	daily: 24 * 60 * 60,
	weekly: 7 * 24 * 60 * 60,
	monthly: 30 * 24 * 60 * 60,
}

export type BaseModuleStatus = {
	isSmartSessionInstalled: boolean
	isSessionExist: boolean
	isRhinestoneAttesterTrusted: boolean
	permissionId: string | null
}

export type FrequencyOption = {
	id: string
	label: string
}

// Utility Functions
export function validateTimes(times: number | undefined): boolean {
	if (times === undefined) return false
	if (!Number.isInteger(times)) return false
	if (times < 1 || times > 10) return false
	return true
}

export function validateAmount(amount: string): boolean {
	if (amount === '') return false
	if (!Number.isFinite(Number(amount))) return false
	if (Number(amount) <= 0) return false
	return true
}

export function getFrequencyOptions(): FrequencyOption[] {
	return [
		...(IS_DEV ? [{ id: '3min', label: '3 min' }] : []),
		{ id: 'daily', label: 'Daily' },
		{ id: 'weekly', label: 'Weekly' },
		{ id: 'monthly', label: 'Monthly' },
	]
}

export function useReviewButton(
	isValid: ComputedRef<boolean>,
	errorReview: Ref<string | null>,
	isLoading: Ref<boolean>,
	actionType: 'transfer' | 'swap',
) {
	const { isAccountConnected } = useAccount()
	const { isBackendHealthy } = useBackend()

	const reviewDisabled = computed(() => {
		return !isAccountConnected.value || !isValid.value || !isBackendHealthy.value
	})

	const reviewButtonText = computed(() => {
		if (!isBackendHealthy.value) return 'Backend service is unavailable'
		if (!isAccountConnected.value) return 'Connect your account to review'
		if (!isValid.value) return `Invalid scheduled ${actionType}`
		if (errorReview.value) return errorReview.value
		return `Review schedule ${actionType}`
	})

	return {
		reviewDisabled,
		reviewButtonText,
		isLoading,
	}
}

// Existing functions
export async function validateAccount() {
	const { isModular, selectedAccount } = useAccount()

	if (!selectedAccount.value) {
		throw new Error('No account selected')
	}

	if (!isModular.value) {
		throw new Error('Account is not modular')
	}

	return selectedAccount.value
}

export async function checkBaseModuleStatus(
	client: JsonRpcApiProvider,
	accountAddress: string,
): Promise<BaseModuleStatus> {
	const account = TIERC7579Account__factory.connect(accountAddress, client)

	// Check if SmartSession module is installed
	const isSmartSessionInstalled = await account.isModuleInstalled(
		ERC7579_MODULE_TYPE.VALIDATOR,
		ADDRESS.SmartSession,
		'0x',
	)

	// Check if Rhinestone Attester is trusted (for Kernel accounts)
	const { selectedAccount } = useAccount()
	const isRhinestoneAttesterTrusted = selectedAccount.value?.accountId !== 'kernel.advanced.v0.3.1'

	return {
		isSmartSessionInstalled,
		isSessionExist: false, // To be determined by specific implementations
		isRhinestoneAttesterTrusted,
		permissionId: null, // To be determined by specific implementations
	}
}

export function buildRhinestoneAttesterExecutions(isRhinestoneAttesterTrusted: boolean): TxModalExecution[] {
	if (isRhinestoneAttesterTrusted) {
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
			description: 'Trust Rhinestone Attester',
		},
	]
}
