import { AccountId } from '@/stores/account/account'
import { hexlify, JsonRpcProvider, randomBytes } from 'ethers'
import {
	AccountAPI,
	ADDRESS,
	ERC7579_MODULE_TYPE,
	ERC7579Module,
	findPrevious,
	INTERFACES,
	Kernel,
	KernelAccountAPI,
	KernelValidationType,
	Nexus,
	NexusAccountAPI,
	Safe7579,
	Safe7579AccountAPI,
	Simple7702AccountAPI,
	SimpleSmartSessionValidation,
	TISafe7579__factory,
	TNexus__factory,
	ValidationAPI,
	zeroPadLeft,
} from 'sendop'

export interface AppValidation {
	validation: ValidationAPI
	validatorAddress: string
}

export function getExecutionAccountAPI(accountId: AccountId, validation: AppValidation): AccountAPI {
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return new KernelAccountAPI(validation)
		case AccountId['biconomy.nexus.1.0.2']:
			return new NexusAccountAPI(validation)
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return new Safe7579AccountAPI(validation)
		case AccountId['infinitism.Simple7702Account.0.8.0']:
			return new Simple7702AccountAPI()
		default:
			throw new Error(`[getExecutionAccountAPI] Unsupported accountId: ${accountId}`)
	}
}

export function getSmartSessionExecutionAccountAPI(accountId: AccountId, permissionId: string): AccountAPI {
	const validation = {
		validation: new SimpleSmartSessionValidation({
			permissionId: permissionId,
			threshold: 1,
		}),
		validatorAddress: ADDRESS.SmartSession,
	}
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return new KernelAccountAPI({
				...validation,
				config: {
					nonceConfig: {
						type: KernelValidationType.VALIDATOR,
						key: hexlify(randomBytes(2)),
					},
				},
			})
		case AccountId['biconomy.nexus.1.0.2']:
			return new NexusAccountAPI({
				...validation,
				config: {
					nonceConfig: {
						key: hexlify(randomBytes(3)),
					},
				},
			})
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return new Safe7579AccountAPI({
				...validation,
				config: {
					nonceConfig: {
						key: hexlify(randomBytes(4)),
					},
				},
			})
		default:
			throw new Error(`[getSmartSessionExecutionAccountAPI] Unsupported accountId: ${accountId}`)
	}
}

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
			return Nexus.encodeInstallModule(config)
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return Safe7579.encodeInstallModule(config)
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
			return Nexus.encodeUninstallModule({
				...config,
				prev,
			})
		}
		case AccountId['rhinestone.safe7579.v1.0.0']: {
			const safe = TISafe7579__factory.connect(accountAddress, client)
			const validators = await safe.getValidatorsPaginated(zeroPadLeft('0x01', 20), 10)
			const prev = findPrevious(validators.array, module.address)
			return Safe7579.encodeUninstallModule({
				...config,
				prev,
			})
		}
		default:
			throw new Error(`[getUninstallModuleData] Unsupported account: ${accountId}`)
	}
}
