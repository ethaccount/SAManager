import { ValidationMethod } from '@/lib/validations'
import { JsonRpcProvider } from 'ethers'
import { AccountAPI, ERC7579Module, ValidationAPI } from 'sendop'
import { AccountRegistry } from './registry'
import { AccountId, Deployment } from './types'

export async function getDeployment(
	client: JsonRpcProvider,
	accountId: AccountId,
	validation: ValidationMethod,
	salt: string,
): Promise<Deployment> {
	const provider = AccountRegistry.getProvider(accountId)
	return provider.getDeployment(client, validation, salt)
}

export function getExecutionAccountAPI(
	accountId: AccountId,
	validationAPI: ValidationAPI,
	validatorAddress?: string,
): AccountAPI {
	return AccountRegistry.getProvider(accountId).getExecutionAccountAPI(validationAPI, validatorAddress)
}

export function getSmartSessionExecutionAccountAPI(accountId: AccountId, permissionId: string): AccountAPI {
	return AccountRegistry.getProvider(accountId).getSmartSessionExecutionAccountAPI(permissionId)
}

export function getInstallModuleData(accountId: AccountId, module: ERC7579Module): string {
	return AccountRegistry.getProvider(accountId).getInstallModuleData(module)
}

export async function getUninstallModuleData(
	accountId: AccountId,
	module: ERC7579Module,
	accountAddress: string,
	client: JsonRpcProvider,
): Promise<string> {
	return AccountRegistry.getProvider(accountId).getUninstallModuleData(module, accountAddress, client)
}
