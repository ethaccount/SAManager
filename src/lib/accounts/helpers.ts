import { AccountRegistry } from './registry'
import { AccountId } from './types'

export function displayAccountName(accountId: AccountId) {
	return AccountRegistry.getConfig(accountId).name
}

export function isModularAccount(accountId: AccountId): boolean {
	return AccountRegistry.getConfig(accountId).isModular
}

export function getAccountEntryPointVersion(accountId: AccountId) {
	return AccountRegistry.getConfig(accountId).entryPointVersion
}
