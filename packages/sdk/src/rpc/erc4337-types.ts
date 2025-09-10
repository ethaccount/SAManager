export type UserOperationReceiptHex = {
	userOpHash: string
	entryPoint: string
	sender: string
	nonce: string
	paymaster: string
	actualGasUsed: string
	actualGasCost: string
	success: boolean
	logs: UserOperationLogHex[]
	receipt: {
		transactionHash: string
		transactionIndex: string
		from: string
		to: string
		status: string
		logsBloom: string
		blockHash: string
		blockNumber: string
		contractAddress: null | string
		gasUsed: string
		cumulativeGasUsed: string
		effectiveGasPrice: string
		logs: UserOperationLogHex[]
	}
}

export type UserOperationLogHex = {
	logIndex: string
	transactionIndex: string
	transactionHash: string
	blockHash: string
	blockNumber: string
	address: string
	data: string
	topics: string[]
}
