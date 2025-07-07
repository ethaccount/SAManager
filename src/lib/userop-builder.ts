import { AccountId } from '@/lib/accounts'
import { JsonRpcProvider } from 'ethers'
import { UserOpBuilder } from 'ethers-erc4337'
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
