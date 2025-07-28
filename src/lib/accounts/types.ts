import { ValidationMethod } from '@/lib/validations'
import { JsonRpcProvider } from 'ethers'
import { AccountAPI, ERC7579Module, ValidationAPI, EntryPointVersion } from 'sendop'

export enum AccountId {
	'kernel.advanced.v0.3.1' = 'kernel.advanced.v0.3.1',
	'kernel.advanced.v0.3.3' = 'kernel.advanced.v0.3.3',
	'biconomy.nexus.1.0.2' = 'biconomy.nexus.1.0.2',
	'biconomy.nexus.1.2.0' = 'biconomy.nexus.1.2.0',
	'rhinestone.safe7579.v1.0.0' = 'rhinestone.safe7579.v1.0.0',
	'infinitism.Simple7702Account.0.8.0' = 'infinitism.Simple7702Account.0.8.0',
}

export type Deployment = {
	accountAddress: string
	factory: string
	factoryData: string
}

export interface AccountProvider {
	getExecutionAccountAPI(validationAPI: ValidationAPI, validatorAddress?: string): AccountAPI
	getSmartSessionExecutionAccountAPI(permissionId: string): AccountAPI
	getInstallModuleData(module: ERC7579Module): string
	getUninstallModuleData(module: ERC7579Module, accountAddress: string, client: JsonRpcProvider): Promise<string>
	getDeployment(client: JsonRpcProvider, validation: ValidationMethod, salt: string): Promise<Deployment>

	// TODO: remove ?
	sign1271?(hash: Uint8Array, vMethod: ValidationMethod): Promise<string>
}

export type AccountConfig = {
	provider: AccountProvider
	name: AccountName
	isModular: boolean
	entryPointVersion: EntryPointVersion
	canCreate: boolean
	version: string // example: '0.3.1'
}

export type AccountName = 'Kernel' | 'Nexus' | 'Safe7579' | 'Simple7702Account'
