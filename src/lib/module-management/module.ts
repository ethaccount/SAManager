import { AccountId } from '@/stores/account/account'
import { ADDRESS, ERC7579_MODULE_TYPE, INTERFACES, KernelV3Account, NexusAccount, Safe7579Account } from 'sendop'

export function getEncodedInstallSmartSession(accountId: AccountId, initData: string) {
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return KernelV3Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
				moduleAddress: ADDRESS.SmartSession,
				initData,
				selectorData: INTERFACES.KernelV3.getFunction('execute').selector,
			})
		case AccountId['biconomy.nexus.1.0.2']:
			return NexusAccount.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
				moduleAddress: ADDRESS.SmartSession,
				initData,
			})
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return Safe7579Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
				moduleAddress: ADDRESS.SmartSession,
				initData,
			})
		default:
			throw new Error(`getEncodedInstallSmartSession: Unsupported account for install: ${accountId}`)
	}
}

export function getEncodedInstallScheduledTransfers(accountId: AccountId, initData: string) {
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return KernelV3Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledTransfers,
				initData,
			})
		case AccountId['biconomy.nexus.1.0.2']:
			return NexusAccount.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledTransfers,
				initData,
			})
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return Safe7579Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledTransfers,
				initData,
			})
		default:
			throw new Error(`getEncodedInstallScheduledTransfers: Unsupported account for install: ${accountId}`)
	}
}

export function getEncodedInstallScheduledOrders(accountId: AccountId, initData: string) {
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return KernelV3Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledOrders,
				initData,
			})
		case AccountId['biconomy.nexus.1.0.2']:
			return NexusAccount.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledOrders,
				initData,
			})
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return Safe7579Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledOrders,
				initData,
			})
		default:
			throw new Error(`getEncodedInstallScheduledOrders: Unsupported account for install: ${accountId}`)
	}
}
