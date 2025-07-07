import { EntryPointVersion } from 'sendop'
import {
	KernelAccountProvider,
	NexusAccountProvider,
	Safe7579AccountProvider,
	Simple7702AccountProvider,
} from './providers'
import { AccountId, AccountProvider, AccountConfig } from './types'

export class AccountRegistry {
	private static readonly registry = new Map<AccountId, AccountConfig>()

	static register(accountId: AccountId, config: AccountConfig): void {
		this.registry.set(accountId, config)
	}

	static getProvider(accountId: AccountId): AccountProvider {
		const config = this.registry.get(accountId)
		if (!config) {
			throw new Error(`Unknown account type: ${accountId}`)
		}
		return config.provider
	}

	static getConfig(accountId: AccountId): AccountConfig {
		const config = this.registry.get(accountId)
		if (!config) {
			throw new Error(`Unknown account type: ${accountId}`)
		}
		return config
	}

	static getSupportedAccounts(): AccountId[] {
		return Array.from(this.registry.keys())
	}

	static getSupportedAccountsForCreation(): AccountId[] {
		return Array.from(this.registry.keys()).filter(accountId => this.getConfig(accountId).canCreate)
	}

	static getEntryPointVersion(accountId: AccountId): EntryPointVersion {
		return this.getConfig(accountId).entryPointVersion
	}
}

AccountRegistry.register(AccountId['kernel.advanced.v0.3.1'], {
	provider: new KernelAccountProvider(),
	name: 'Kernel',
	isModular: true,
	entryPointVersion: 'v0.7',
	canCreate: false,
})
AccountRegistry.register(AccountId['kernel.advanced.v0.3.3'], {
	provider: new KernelAccountProvider(),
	name: 'Kernel',
	isModular: true,
	entryPointVersion: 'v0.7',
	canCreate: true,
})
AccountRegistry.register(AccountId['biconomy.nexus.1.0.2'], {
	provider: new NexusAccountProvider(),
	name: 'Nexus',
	isModular: true,
	entryPointVersion: 'v0.7',
	canCreate: true,
})
AccountRegistry.register(AccountId['rhinestone.safe7579.v1.0.0'], {
	provider: new Safe7579AccountProvider(),
	name: 'Safe7579',
	isModular: true,
	entryPointVersion: 'v0.7',
	canCreate: true,
})
AccountRegistry.register(AccountId['infinitism.Simple7702Account.0.8.0'], {
	provider: new Simple7702AccountProvider(),
	name: 'Simple7702Account',
	isModular: false,
	entryPointVersion: 'v0.8',
	canCreate: false,
})
