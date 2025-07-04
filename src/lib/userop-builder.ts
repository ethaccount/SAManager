import { AccountId } from '@/stores/account/account'
import { JsonRpcProvider } from 'ethers'
import { UserOpBuilder } from 'ethers-erc4337'
import { Execution } from 'sendop'
import { AppValidation, getExecutionAccountAPI, getSmartSessionExecutionAccountAPI } from './account-specific'

export async function buildAccountExecutions({
	op,
	accountId,
	validation,
	accountAddress,
	client,
	executions,
}: {
	op: UserOpBuilder
	accountId: AccountId
	validation: AppValidation
	accountAddress: string
	client: JsonRpcProvider
	executions: Execution[]
}) {
	const accountAPI = getExecutionAccountAPI(accountId, validation)
	return op
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
		.setSender(accountAddress)
		.setCallData(await accountAPI.getCallData(executions))
		.setNonce(await accountAPI.getNonce(client, accountAddress))
		.setSignature(await accountAPI.getDummySignature())
}
