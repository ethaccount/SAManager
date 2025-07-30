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
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579AccountAPI,
	Safe7579API,
	SimpleSmartSessionValidation,
	ValidationAPI,
	zeroPadLeft,
} from 'sendop'
import { AccountProvider, Deployment, Sign1271Config } from '../types'

export class Safe7579AccountProvider implements AccountProvider {
	getExecutionAccountAPI(validationAPI: ValidationAPI, validatorAddress?: string): AccountAPI {
		if (!validatorAddress) {
			throw new Error('[Safe7579AccountProvider] validatorAddress is required')
		}
		return new Safe7579AccountAPI({
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
		return new Safe7579AccountAPI({
			...validation,
			config: {
				nonceConfig: {
					key: hexlify(randomBytes(4)),
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
		return Safe7579API.encodeInstallModule(config)
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
		return Safe7579API.encodeUninstallModule({
			...config,
			prev,
		})
	}

	async getDeployment(client: JsonRpcProvider, validation: ValidationMethod, salt: string): Promise<Deployment> {
		if (!validation.isModule) {
			throw new Error('[Safe7579AccountProvider] Validation method is not a module')
		}

		const module = getModuleByValidationMethod(validation)
		return await Safe7579API.getDeployment({
			client,
			salt,
			creationOptions: {
				validatorAddress: module.address,
				validatorInitData: module.initData,
				owners: [validation.identifier],
				ownersThreshold: 1,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				attestersThreshold: 1,
			},
		})
	}

	async sign1271(config: Sign1271Config): Promise<string> {
		const { typedData, validatorAddress, signTypedData } = config

		if (!validatorAddress) {
			throw new Error('[Safe7579AccountProvider#sign1271] validatorAddress is not set')
		}

		return await Safe7579API.sign1271({
			validatorAddress,
			typedData,
			signTypedData,
		})
	}
}
