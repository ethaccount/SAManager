import { AccountAPI, Simple7702AccountAPI, Simple7702API } from 'sendop'
import { AccountProvider, Deployment, Sign1271Config } from '../types'

export class Simple7702AccountProvider implements AccountProvider {
	getExecutionAccountAPI(): AccountAPI {
		return new Simple7702AccountAPI()
	}

	getSmartSessionExecutionAccountAPI(): AccountAPI {
		throw new Error('[Simple7702AccountProvider#getSmartSessionExecutionAccountAPI] Smart sessions not supported')
	}

	getInstallModuleData(): string {
		throw new Error('[Simple7702AccountProvider#getInstallModuleData] Module installation not supported')
	}

	async getUninstallModuleData(): Promise<string> {
		throw new Error('[Simple7702AccountProvider#getUninstallModuleData] Module uninstallation not supported')
	}

	async getDeployment(): Promise<Deployment> {
		throw new Error('[Simple7702AccountProvider#getDeployment] Deployment not supported')
	}

	async sign1271(config: Sign1271Config): Promise<string> {
		const { typedData, signTypedData } = config
		return await Simple7702API.sign1271({
			typedData,
			signTypedData,
		})
	}
}
