import type { Signer } from 'ethers'
import { getBytes, JsonRpcProvider } from 'ethers'
import type { AccountAPI, Execution, PaymasterAPI } from 'sendop'
import { ERC4337Bundler, UserOpBuilder, type UserOperationReceipt } from 'sendop'

export async function executeUserOperation({
	accountAPI,
	accountAddress,
	chainId,
	client,
	bundler,
	executions,
	signer,
	paymasterAPI,
	gasPrice,
	deployment,
}: {
	accountAPI: AccountAPI
	accountAddress: string
	chainId: number
	client: JsonRpcProvider
	bundler: ERC4337Bundler
	signer: Signer
	paymasterAPI: PaymasterAPI
	executions: Execution[]
	gasPrice: {
		maxFeePerGas: bigint
		maxPriorityFeePerGas: bigint
	}
	deployment?: {
		factory: string
		factoryData: string
	}
}): Promise<UserOperationReceipt> {
	const op = await buildAccountExecutions({
		accountAPI,
		accountAddress,
		chainId,
		client,
		bundler,
		executions,
	})

	if (deployment) {
		op.setFactory(deployment)
	}

	op.setPaymaster({
		paymaster: await paymasterAPI.getPaymaster(),
		paymasterData: await paymasterAPI.getPaymasterData(),
		paymasterPostOpGasLimit: await paymasterAPI.getPaymasterPostOpGasLimit(),
	})

	op.setGasPrice(gasPrice)

	await op.estimateGas()

	const sig = await signer.signMessage(getBytes(op.hash()))
	op.setSignature(await accountAPI.formatSignature(sig)) // format signature by AccountAPI

	await op.send()
	return await op.wait()
}

export async function buildAccountExecutions({
	accountAPI,
	accountAddress,
	chainId,
	client,
	bundler,
	executions,
}: {
	accountAPI: AccountAPI
	accountAddress: string
	chainId: number
	client: JsonRpcProvider
	bundler: ERC4337Bundler
	executions: Execution[]
}) {
	return new UserOpBuilder({ chainId, bundler, entryPointAddress: accountAPI.entryPointAddress })
		.setSender(accountAddress)
		.setCallData(await accountAPI.getCallData(executions))
		.setNonce(await accountAPI.getNonce(client, accountAddress))
		.setSignature(await accountAPI.getDummySignature())
}
