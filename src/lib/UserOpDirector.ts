import { AccountId, AccountRegistry } from '@/lib/accounts'
import { JsonRpcProvider } from 'ethers'
import { AccountAPI, Execution, KernelAccountAPI, KernelValidationType, UserOpBuilder } from 'sendop'
import { getExecutionAccountAPI, getSmartSessionExecutionAccountAPI } from './accounts/account-specific'
import { SignerType } from './validations'
import { ValidationMethod } from './validations/types'

export class UserOpDirector {
	static async buildAccountExecutions({
		op,
		accountId,
		vMethods,
		signerType,
		accountAddress,
		client,
		executions,
	}: {
		op: UserOpBuilder
		accountId: AccountId
		vMethods: ValidationMethod[]
		signerType: SignerType
		accountAddress: string
		client: JsonRpcProvider
		executions: Execution[]
	}) {
		const vMethod = vMethods.find(vMethod => vMethod.signerType === signerType)

		if (!vMethod) {
			throw new Error('[buildAccountExecutions] vMethod not found')
		}

		let accountAPI: AccountAPI

		// Handle special case for kernel advanced v0.3.x
		// If the vMethod is not the first method in the vMethods array,
		// we need to use KernelValidationType.VALIDATOR for non-root validation
		if (AccountRegistry.getName(accountId) === 'Kernel' && vMethods.indexOf(vMethod) !== 0) {
			if (!vMethod.validatorAddress) {
				throw new Error("[buildAccountExecutions] Kernel's validation method must have validatorAddress")
			}

			accountAPI = new KernelAccountAPI({
				validation: vMethod.validationAPI,
				validatorAddress: vMethod.validatorAddress,
				config: {
					nonceConfig: {
						// special case for kernel's non-root validation
						type: KernelValidationType.VALIDATOR,
					},
				},
			})
		} else {
			accountAPI = getExecutionAccountAPI(accountId, vMethod.validationAPI, vMethod.validatorAddress)
		}

		return op
			.setEntryPoint(accountAPI.entryPointAddress)
			.setSender(accountAddress)
			.setCallData(await accountAPI.getCallData(executions))
			.setNonce(await accountAPI.getNonce(client, accountAddress))
			.setSignature(await accountAPI.getDummySignature())
	}

	static async buildSmartSessionExecutions({
		op,
		accountId,
		permissionId,
		accountAddress,
		client,
		executions,
	}: {
		op: UserOpBuilder
		accountId: AccountId
		permissionId: string
		accountAddress: string
		client: JsonRpcProvider
		executions: Execution[]
	}) {
		const accountAPI = getSmartSessionExecutionAccountAPI(accountId, permissionId)
		return op
			.setEntryPoint(accountAPI.entryPointAddress)
			.setSender(accountAddress)
			.setCallData(await accountAPI.getCallData(executions))
			.setNonce(await accountAPI.getNonce(client, accountAddress))
			.setSignature(await accountAPI.getDummySignature())
	}
}
