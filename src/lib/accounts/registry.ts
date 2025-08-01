import { EntryPointVersion } from 'sendop'
import {
	KernelAccountProvider,
	NexusAccountProvider,
	Safe7579AccountProvider,
	Simple7702AccountProvider,
} from './providers'
import { AccountConfig, AccountId, AccountProvider } from './types'

export class AccountRegistry {
	private static readonly registry = new Map<AccountId, AccountConfig>()

	static register(accountId: AccountId, config: AccountConfig): void {
		this.registry.set(accountId, config)
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

	static getProvider(accountId: AccountId): AccountProvider {
		return this.getConfig(accountId).provider
	}

	static getName(accountId: AccountId) {
		return AccountRegistry.getConfig(accountId).name
	}

	static getIsModular(accountId: AccountId): boolean {
		return AccountRegistry.getConfig(accountId).isModular
	}

	static getEntryPointVersion(accountId: AccountId): EntryPointVersion {
		return this.getConfig(accountId).entryPointVersion
	}

	static getCanCreate(accountId: AccountId): boolean {
		return AccountRegistry.getConfig(accountId).canCreate
	}

	static getVersion(accountId: AccountId): string {
		return AccountRegistry.getConfig(accountId).version
	}
}

AccountRegistry.register(AccountId['kernel.advanced.v0.3.1'], {
	provider: new KernelAccountProvider(),
	name: 'Kernel',
	isModular: true,
	entryPointVersion: 'v0.7',
	canCreate: false,
	version: '0.3.1',
})
AccountRegistry.register(AccountId['kernel.advanced.v0.3.3'], {
	provider: new KernelAccountProvider(),
	name: 'Kernel',
	isModular: true,
	entryPointVersion: 'v0.7',
	canCreate: true,
	version: '0.3.3',
})
AccountRegistry.register(AccountId['biconomy.nexus.1.0.2'], {
	provider: new NexusAccountProvider(),
	name: 'Nexus',
	isModular: true,
	entryPointVersion: 'v0.7',
	canCreate: false,
	version: '1.0.2',
})
AccountRegistry.register(AccountId['biconomy.nexus.1.2.0'], {
	provider: new NexusAccountProvider(),
	name: 'Nexus',
	isModular: true,
	entryPointVersion: 'v0.7',
	canCreate: true,
	version: '1.2.0',
})
AccountRegistry.register(AccountId['rhinestone.safe7579.v1.0.0'], {
	provider: new Safe7579AccountProvider(),
	name: 'Safe7579',
	isModular: true,
	entryPointVersion: 'v0.7',
	canCreate: true,
	version: '1.0.0',
})
AccountRegistry.register(AccountId['infinitism.Simple7702Account.0.8.0'], {
	provider: new Simple7702AccountProvider(),
	name: 'Simple7702Account',
	isModular: false,
	entryPointVersion: 'v0.8',
	canCreate: false,
	version: '0.8.0',
})
