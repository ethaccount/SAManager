import { shortenAddress } from '@vue-dapp/core'
import { isAddress } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS } from 'sendop'

const ADDRESS_TO_NAME: Record<string, string> = {
	[ENTRY_POINT_V07_ADDRESS]: 'Entrypoint v0.7',
	[ENTRY_POINT_V08_ADDRESS]: 'Entrypoint v0.8',
}

export function addressToName(address: string) {
	if (!isAddress(address)) return 'Unknown'
	return ADDRESS_TO_NAME[address] || shortenAddress(address)
}
