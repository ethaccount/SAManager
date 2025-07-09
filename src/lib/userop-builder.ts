import { AccountId } from '@/lib/accounts'
import { JsonRpcProvider } from 'ethers'
import { UserOpBuilder, KernelAccountAPI, KernelValidationType } from 'sendop'
import { Execution } from 'sendop'
import { getExecutionAccountAPI, getSmartSessionExecutionAccountAPI } from './accounts/account-specific'
import { ValidationMethod } from './validations/ValidationMethod'

export async function buildAccountExecutions({
	op,
	accountId,
	validationMethod,
	accountAddress,
	client,
	executions,
}: {
	op: UserOpBuilder
	accountId: AccountId
	validationMethod: ValidationMethod
	accountAddress: string
	client: JsonRpcProvider
	executions: Execution[]
}) {
	const accountAPI = getExecutionAccountAPI(
		accountId,
		validationMethod.validationAPI,
		validationMethod.validatorAddress,
	)
	return op
		.setEntryPoint(accountAPI.entryPointAddress)
		.setSender(accountAddress)
		.setCallData(await accountAPI.getCallData(executions))
		.setNonce(await accountAPI.getNonce(client, accountAddress))
		.setSignature(await accountAPI.getDummySignature())
}

export async function buildKernelNonRootExecutions({
	op,
	validationMethod,
	accountAddress,
	client,
	executions,
}: {
	op: UserOpBuilder
	validationMethod: ValidationMethod
	accountAddress: string
	client: JsonRpcProvider
	executions: Execution[]
}) {
	if (!validationMethod.validatorAddress) {
		throw new Error('[buildKernelNonRootExecutions] validatorAddress is required')
	}

	const accountAPI = new KernelAccountAPI({
		validation: validationMethod.validationAPI,
		validatorAddress: validationMethod.validatorAddress,
		config: {
			nonceConfig: {
				type: KernelValidationType.VALIDATOR, // special case for kernel's non-root validation
			},
		},
	})

	return op
		.setEntryPoint(accountAPI.entryPointAddress)
		.setSender(accountAddress)
		.setCallData(await accountAPI.getCallData(executions))
		.setNonce(await accountAPI.getNonce(client, accountAddress))
		.setSignature(await accountAPI.getDummySignature())
}

export async function buildSmartSessionExecutions({
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
