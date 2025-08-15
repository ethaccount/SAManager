import { dataSlice, getAddress, isAddress } from 'ethers'
import { getBytesLength } from 'sendop'

export function extractDelegateAddress(code: string) {
	if (code.startsWith('0xef0100') && isAddress(dataSlice(code, 3, 23)) && getBytesLength(code) === 23) {
		return getAddress(dataSlice(code, 3, 23))
	}
	return null
}
