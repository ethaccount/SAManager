import { AccountRegistry } from '@/lib/accounts/registry'
import { ImportedAccount } from '@/stores/account/account'
import { Capability } from '@samanager/sdk'

export type SupportedCapability = 'atomic' | 'paymasterService'
export const DEFAULT_ACCOUNT_CAPABILITIES: SupportedCapability[] = ['atomic']

export function getAccountCapabilityNames(account: ImportedAccount): SupportedCapability[] {
	return [...DEFAULT_ACCOUNT_CAPABILITIES, ...AccountRegistry.getCapabilities(account.accountId)]
}

export function isAccountCapabilitySupported(
	account: ImportedAccount,
	capName: string,
	capability: Capability,
): capName is SupportedCapability {
	const capNames = getAccountCapabilityNames(account)

	// Ignore optional capabilities
	if (capability.optional === true) {
		return true
	}
	// Check if the capability is supported by the account
	if (!capNames.includes(capName as SupportedCapability)) {
		return false
	}

	return true
}

export function getCapabilities(capNames: SupportedCapability[]): Record<string, Capability> {
	return capNames.reduce((acc, capName) => {
		if (capName === 'atomic') {
			return Object.assign(acc, getAtomicCapability())
		}
		if (capName === 'paymasterService') {
			return Object.assign(acc, getPaymasterServiceCapability())
		}
		return acc
	}, {})
}

function getAtomicCapability(): Capability {
	return {
		atomic: {
			supported: true,
		},
	}
}

function getPaymasterServiceCapability(): Capability {
	return {
		paymasterService: {
			supported: true,
		},
	}
}
