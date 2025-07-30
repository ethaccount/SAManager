import { getModuleByValidationMethod, ValidationMethod } from '@/lib/validations'
import { hexlify, JsonRpcProvider, randomBytes } from 'ethers'
import {
	AccountAPI,
	ADDRESS,
	ERC7579_MODULE_TYPE,
	ERC7579Module,
	KernelAccountAPI,
	KernelAPI,
	KernelValidationType,
	SimpleSmartSessionValidation,
	ValidationAPI,
} from 'sendop'
import { AccountRegistry } from '../registry'
import { AccountProvider, Deployment, Sign1271Config } from '../types'

export class KernelAccountProvider implements AccountProvider {
	getExecutionAccountAPI(validationAPI: ValidationAPI, validatorAddress?: string): AccountAPI {
		if (!validatorAddress) {
			throw new Error('[KernelAccountProvider] validatorAddress is required')
		}
		return new KernelAccountAPI({
			validation: validationAPI,
			validatorAddress,
		})
	}

	getSmartSessionExecutionAccountAPI(permissionId: string): AccountAPI {
		const validation = {
			validation: new SimpleSmartSessionValidation({
				permissionId: permissionId,
				threshold: 1,
			}),
			validatorAddress: ADDRESS.SmartSession,
		}
		return new KernelAccountAPI({
			...validation,
			config: {
				nonceConfig: {
					type: KernelValidationType.VALIDATOR,
					key: hexlify(randomBytes(2)),
				},
			},
		})
	}

	getInstallModuleData(module: ERC7579Module): string {
		const config = {
			moduleType: module.type as ERC7579_MODULE_TYPE.VALIDATOR | ERC7579_MODULE_TYPE.EXECUTOR,
			moduleAddress: module.address,
			initData: module.initData,
		}
		if (module.type === ERC7579_MODULE_TYPE.VALIDATOR) {
			return KernelAPI.encodeInstallModule({
				...config,
				selectorData: KernelAPI.executeSelector,
			})
		}
		return KernelAPI.encodeInstallModule(config)
	}

	async getUninstallModuleData(module: ERC7579Module): Promise<string> {
		const config = {
			moduleType: module.type as ERC7579_MODULE_TYPE.VALIDATOR | ERC7579_MODULE_TYPE.EXECUTOR,
			moduleAddress: module.address,
			deInitData: module.deInitData,
		}
		return KernelAPI.encodeUninstallModule(config)
	}

	async getDeployment(client: JsonRpcProvider, validation: ValidationMethod, salt: string): Promise<Deployment> {
		if (!validation.isModule) {
			throw new Error('[KernelAccountProvider] Validation method is not a module')
		}

		const module = getModuleByValidationMethod(validation)
		return await KernelAPI.getDeployment({
			client,
			validatorAddress: module.address,
			validatorData: module.initData,
			salt,
		})
	}

	async sign1271(config: Sign1271Config): Promise<string> {
		const { hash, accountId, validatorAddress, chainId, accountAddress, signTypedData } = config

		if (!validatorAddress) {
			throw new Error('[KernelAccountProvider#sign1271] validatorAddress is not set')
		}

		return await KernelAPI.sign1271({
			hash,
			version: AccountRegistry.getVersion(accountId) as '0.3.1' | '0.3.3',
			validator: validatorAddress,
			chainId,
			accountAddress,
			signTypedData,
		})
	}
}
