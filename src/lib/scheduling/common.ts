import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
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

export function buildRhinestoneAttesterExecutions(isRhinestoneAttesterTrusted: boolean): Execution[] {
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
		},
	]
}
