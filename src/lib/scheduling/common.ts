import { findTrustedAttesters } from '@/api/registry'
import { AccountRegistry } from '@/lib/accounts'
import { ImportedAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useBackend } from '@/stores/useBackend'
import { ExecutionModalExecution } from '@/components/ExecutionModal'
import { JsonRpcProvider } from 'ethers'
import {
	ADDRESS,
	ERC7579_MODULE_TYPE,
	IERC7579Account__factory,
	Registry__factory,
	RHINESTONE_ATTESTER_ADDRESS,
} from 'sendop'

export const DEFAULT_FREQUENCY = '3min'

export const frequencyToSeconds: Record<string, number> = {
	'1sec': 1,
	'3min': 3 * 60,
	'10min': 10 * 60,
	'30min': 30 * 60,
	'1hr': 60 * 60,
	'3hr': 3 * 60 * 60,
	'6hr': 6 * 60 * 60,
	'12hr': 12 * 60 * 60,
	daily: 24 * 60 * 60,
	weekly: 7 * 24 * 60 * 60,
	monthly: 30 * 24 * 60 * 60,
}

export function getFrequencyOptions(): FrequencyOption[] {
	return [
		{ id: '1sec', label: '1 second' },
		{ id: '3min', label: '3 minutes' },
		{ id: '10min', label: '10 minutes' },
		{ id: '30min', label: '30 minutes' },
		{ id: '1hr', label: '1 hour' },
		{ id: '3hr', label: '3 hours' },
		{ id: '6hr', label: '6 hours' },
		{ id: '12hr', label: '12 hours' },
		{ id: 'daily', label: 'Daily' },
		{ id: 'weekly', label: 'Weekly' },
		{ id: 'monthly', label: 'Monthly' },
	]
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

export function useReviewButton(
	isValid: ComputedRef<boolean>,
	isLoading: Ref<boolean>,
	actionType: 'transfer' | 'swap',
) {
	const { isAccountAccessible } = useAccount()
	const { isBackendHealthy, isBackendHealthyLoading } = useBackend()

	const reviewDisabled = computed(() => {
		return !isAccountAccessible.value || !isValid.value || !isBackendHealthy.value || isBackendHealthyLoading.value
	})

	const reviewButtonText = computed(() => {
		if (isBackendHealthyLoading.value) return 'Checking backend health...'
		if (!isBackendHealthy.value) return 'Backend service is unavailable'
		if (!isAccountAccessible.value) return 'Connect your account first'
		if (!isValid.value) return `Invalid scheduled ${actionType}`
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
	client: JsonRpcProvider,
	importedAccount: ImportedAccount,
	isDeployed: boolean,
): Promise<BaseModuleStatus> {
	let isSmartSessionInstalled = false

	if (isDeployed) {
		const account = IERC7579Account__factory.connect(importedAccount.address, client)

		// Check if SmartSession module is installed
		isSmartSessionInstalled = await account.isModuleInstalled(
			ERC7579_MODULE_TYPE.VALIDATOR,
			ADDRESS.SmartSession,
			'0x',
		)
	}

	// Check if Rhinestone Attester is trusted (for Kernel accounts)
	const isRhinestoneAttesterTrusted = await checkRhinestoneAttesterTrusted(client, importedAccount)

	return {
		isSmartSessionInstalled,
		isSessionExist: false, // To be determined by specific implementations
		isRhinestoneAttesterTrusted,
		permissionId: null, // To be determined by specific implementations
	}
}

export async function checkRhinestoneAttesterTrusted(
	client: JsonRpcProvider,
	importedAccount: ImportedAccount,
): Promise<boolean> {
	// Only check for Kernel accounts because Nexus and Safe7579 will trust Rhinestone Attester when deployed
	if (AccountRegistry.getName(importedAccount.accountId) === 'Kernel') {
		const attesters = await findTrustedAttesters(client, importedAccount.address)
		return attesters.includes(RHINESTONE_ATTESTER_ADDRESS)
	}
	return true
}

export function buildRhinestoneAttesterExecutions(isRhinestoneAttesterTrusted: boolean): ExecutionModalExecution[] {
	if (isRhinestoneAttesterTrusted) {
		return []
	}

	return [
		{
			to: ADDRESS.Registry,
			value: 0n,
			data: Registry__factory.createInterface().encodeFunctionData('trustAttesters', [
				1,
				[RHINESTONE_ATTESTER_ADDRESS],
			]),
			description: 'Trust Rhinestone Attester',
		},
	]
}
