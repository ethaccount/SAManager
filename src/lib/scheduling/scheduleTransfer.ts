import { concat, toBeHex } from 'ethers'
import { abiEncode, zeroPadLeft } from 'sendop'

export function getOrderData(options: {
	executeInterval: number
	numOfExecutions: number
	startDate: number
	recipient: string
	tokenAddress: string
	amount: bigint
}) {
	// initData: executeInterval (6) ++ numOfExecutions (2) ++ startDate (6) ++ executionData
	return concat([
		zeroPadLeft(toBeHex(options.executeInterval), 6),
		zeroPadLeft(toBeHex(options.numOfExecutions), 2),
		zeroPadLeft(toBeHex(options.startDate), 6),
		abiEncode(['address', 'address', 'uint256'], [options.recipient, options.tokenAddress, options.amount]),
	])
}
