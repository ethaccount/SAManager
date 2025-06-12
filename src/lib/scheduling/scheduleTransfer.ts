import { NATIVE_TOKEN_ADDRESS } from '@/lib/token'
import { concat, toBeHex, ZeroAddress } from 'ethers'
import { abiEncode, isSameAddress, zeroPadLeft } from 'sendop'

export function createScheduledTransfersInitData({
	executeInterval,
	numOfExecutions,
	startDate,
	recipient,
	tokenAddress,
	amount,
}: {
	executeInterval: number
	numOfExecutions: number
	startDate: number
	recipient: string
	tokenAddress: string
	amount: bigint
}) {
	let tokenAddressToUse = tokenAddress

	// ScheduledTransfers.executeOrder use zero address for native token
	if (isSameAddress(tokenAddress, NATIVE_TOKEN_ADDRESS)) {
		tokenAddressToUse = ZeroAddress
	}

	// initData: executeInterval (6) ++ numOfExecutions (2) ++ startDate (6) ++ executionData
	return concat([
		zeroPadLeft(toBeHex(executeInterval), 6),
		zeroPadLeft(toBeHex(numOfExecutions), 2),
		zeroPadLeft(toBeHex(startDate), 6),
		abiEncode(['address', 'address', 'uint256'], [recipient, tokenAddressToUse, amount]),
	])
}
