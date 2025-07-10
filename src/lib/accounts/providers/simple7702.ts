import { AccountAPI, Simple7702AccountAPI } from 'sendop'
import { AccountProvider, Deployment } from '../types'

export class Simple7702AccountProvider implements AccountProvider {
	getExecutionAccountAPI(): AccountAPI {
		return new Simple7702AccountAPI()
	}

	getSmartSessionExecutionAccountAPI(): AccountAPI {
		throw new Error('[Simple7702AccountProvider] Smart sessions not supported')
	}

	getInstallModuleData(): string {
		throw new Error('[Simple7702AccountProvider] Module installation not supported')
	}

	async getUninstallModuleData(): Promise<string> {
		throw new Error('[Simple7702AccountProvider] Module uninstallation not supported')
	}

	async getDeployment(): Promise<Deployment> {
		throw new Error('[Simple7702AccountProvider] Deployment not supported')
	}
}
