import { AccountId } from '@/stores/account/account'
import { JsonRpcProvider } from 'ethers'
import {
	ERC7579_MODULE_TYPE,
	ERC7579Module,
	findPrevious,
	INTERFACES,
	Kernel,
	NexusAccount,
	Safe7579Account,
	TISafe7579__factory,
	TNexus__factory,
	zeroPadLeft,
} from 'sendop'

export function getInstallModuleData(accountId: AccountId, module: ERC7579Module) {
	const config = {
		moduleType: module.type as ERC7579_MODULE_TYPE.VALIDATOR | ERC7579_MODULE_TYPE.EXECUTOR,
		moduleAddress: module.address,
		initData: module.initData,
	}
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			if (module.type === ERC7579_MODULE_TYPE.VALIDATOR) {
				return Kernel.encodeInstallModule({
					...config,
					selectorData: INTERFACES.KernelV3.getFunction('execute').selector,
				})
			}
			return Kernel.encodeInstallModule(config)
		case AccountId['biconomy.nexus.1.0.2']:
			return NexusAccount.encodeInstallModule(config)
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return Safe7579Account.encodeInstallModule(config)
		default:
			throw new Error(`[getInstallModuleData] Unsupported account: ${accountId}`)
	}
}

export async function getUninstallModuleData(
	accountId: AccountId,
	module: ERC7579Module,
	accountAddress: string,
	client: JsonRpcProvider,
) {
	const config = {
		moduleType: module.type as ERC7579_MODULE_TYPE.VALIDATOR | ERC7579_MODULE_TYPE.EXECUTOR,
		moduleAddress: module.address,
		deInitData: module.deInitData,
	}
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return Kernel.encodeUninstallModule(config)
		case AccountId['biconomy.nexus.1.0.2']: {
			const nexus = TNexus__factory.connect(accountAddress, client)
			const validators = await nexus.getValidatorsPaginated(zeroPadLeft('0x01', 20), 10)
			const prev = findPrevious(validators.array, module.address)
			return NexusAccount.encodeUninstallModule({
				...config,
				prev,
			})
		}
		case AccountId['rhinestone.safe7579.v1.0.0']: {
			const safe = TISafe7579__factory.connect(accountAddress, client)
			const validators = await safe.getValidatorsPaginated(zeroPadLeft('0x01', 20), 10)
			const prev = findPrevious(validators.array, module.address)
			return Safe7579Account.encodeUninstallModule({
				...config,
				prev,
			})
		}
		default:
			throw new Error(`[getUninstallModuleData] Unsupported account: ${accountId}`)
	}
}
