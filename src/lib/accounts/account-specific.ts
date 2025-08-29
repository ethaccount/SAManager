import { ValidationMethod, ValidationMethodName, ValidationType } from '@/lib/validations'
import { JsonRpcProvider } from 'ethers'
import { AccountAPI, ERC7579Module, ValidationAPI } from 'sendop'
import { AccountRegistry } from './registry'
import { AccountId, Deployment, Sign1271Config } from './types'

// Validation methods that can be created for new accounts in Create.vue
export const ACCOUNT_SUPPORTED_INITIAL_VALIDATION: Partial<
	Record<
		AccountId,
		{
			type: ValidationType
			name: ValidationMethodName
		}[]
	>
> = {
	[AccountId['kernel.advanced.v0.3.3']]: [
		{ type: 'EOA-Owned', name: 'OwnableValidator' },
		{ type: 'PASSKEY', name: 'WebAuthnValidator' },
	],
	[AccountId['biconomy.nexus.1.2.0']]: [
		{ type: 'EOA-Owned', name: 'OwnableValidator' },
		{ type: 'PASSKEY', name: 'WebAuthnValidator' },
	],
	[AccountId['rhinestone.safe7579.v1.0.0']]: [{ type: 'EOA-Owned', name: 'OwnableValidator' }],
} as const

// Validation methods that can be installed for deployed accounts in Account Management (AMModules.vue)
export const ACCOUNT_SUPPORTED_INSTALL_VALIDATION: Partial<
	Record<
		AccountId,
		{
			type: ValidationType
			name: ValidationMethodName
		}[]
	>
> = {
	[AccountId['kernel.advanced.v0.3.3']]: [
		{ type: 'EOA-Owned', name: 'ECDSAValidator' },
		{ type: 'PASSKEY', name: 'WebAuthnValidator' },
		{ type: 'EOA-Owned', name: 'OwnableValidator' },
	],
	[AccountId['biconomy.nexus.1.2.0']]: [
		{ type: 'EOA-Owned', name: 'OwnableValidator' },
		{ type: 'PASSKEY', name: 'WebAuthnValidator' },
	],
	[AccountId['rhinestone.safe7579.v1.0.0']]: [
		{ type: 'EOA-Owned', name: 'OwnableValidator' },
		{ type: 'PASSKEY', name: 'WebAuthnValidator' },
	],
} as const

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

export async function sign1271(config: Sign1271Config): Promise<string> {
	const provider = AccountRegistry.getProvider(config.accountId)
	return provider.sign1271(config)
}
