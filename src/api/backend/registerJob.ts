import { UserOperationHex } from 'ethers-erc4337'

export async function apiRegisterJob(
	accountAddress: string,
	chainId: number,
	jobId: bigint,
	entryPointAddress: string,
	jobType: string,
	userOperationHex: UserOperationHex,
): Promise<{
	id: string
	accountAddress: string
	chainId: number
	onChainJobId: number
	jobType: string
	userOperationHex: UserOperationHex
	entryPointAddress: string
	createdAt: string
	updatedAt: string
}> {
	const response = await fetch('/backend/jobs', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			accountAddress,
			chainId,
			jobId: Number(jobId),
			entryPoint: entryPointAddress,
			userOperation: userOperationHex,
			jobType,
		}),
	})

	if (!response.ok) {
		throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
	}

	const result = await response.json()

	// Check API response format
	if (result.code !== 0) {
		throw new Error(`API error: ${result.message}${result.error ? ` - ${JSON.stringify(result.error)}` : ''}`)
	}

	return result.data
}
