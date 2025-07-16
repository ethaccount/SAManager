import { getModuleByValidationMethod, ValidationMethod } from '@/lib/validations'
import { hexlify, JsonRpcProvider, randomBytes } from 'ethers'
import {
	AccountAPI,
	ADDRESS,
	BICONOMY_ATTESTER_ADDRESS,
	ERC7579_MODULE_TYPE,
	ERC7579Module,
	findPrevious,
	getValidatorsPaginated,
	NexusAccountAPI,
	NexusAPI,
	RHINESTONE_ATTESTER_ADDRESS,
	SimpleSmartSessionValidation,
	ValidationAPI,
	zeroPadLeft,
} from 'sendop'
import { AccountProvider, Deployment } from '../types'

export class NexusAccountProvider implements AccountProvider {
	getExecutionAccountAPI(validationAPI: ValidationAPI, validatorAddress?: string): AccountAPI {
		if (!validatorAddress) {
			throw new Error('[NexusAccountProvider] validatorAddress is required')
		}
		return new NexusAccountAPI({
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
		return new NexusAccountAPI({
			...validation,
			config: {
				nonceConfig: {
					key: hexlify(randomBytes(3)),
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
		return NexusAPI.encodeInstallModule(config)
	}

	async getUninstallModuleData(
		module: ERC7579Module,
		accountAddress: string,
		client: JsonRpcProvider,
	): Promise<string> {
		const config = {
			moduleType: module.type as ERC7579_MODULE_TYPE.VALIDATOR | ERC7579_MODULE_TYPE.EXECUTOR,
			moduleAddress: module.address,
			deInitData: module.deInitData,
		}
		const { validators } = await getValidatorsPaginated(client, accountAddress, zeroPadLeft('0x01', 20), 10)
		const prev = findPrevious(validators, module.address)
		return NexusAPI.encodeUninstallModule({
			...config,
			prev,
		})
	}

	async getDeployment(client: JsonRpcProvider, validation: ValidationMethod, salt: string): Promise<Deployment> {
		if (!validation.isModule) {
			throw new Error('[NexusAccountProvider] Validation method is not a module')
		}

		const module = getModuleByValidationMethod(validation)
		return await NexusAPI.getDeployment({
			client,
			salt,
			creationOptions: {
				validatorAddress: module.address,
				validatorInitData: module.initData,
				bootstrap: 'initNexusWithSingleValidator',
				registryAddress: ADDRESS.Registry,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				threshold: 1,
			},
		})
	}
}
