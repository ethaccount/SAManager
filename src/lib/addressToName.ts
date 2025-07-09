import { shortenAddress } from '@vue-dapp/core'
import { isAddress } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS, ADDRESS } from 'sendop'

const ADDRESS_TO_NAME: Record<string, string> = {
	[ENTRY_POINT_V07_ADDRESS]: 'Entrypoint v0.7',
	[ENTRY_POINT_V08_ADDRESS]: 'Entrypoint v0.8',
	[ADDRESS.ECDSAValidator]: 'ECDSA Validator',
	[ADDRESS.WebAuthnValidator]: 'WebAuthn Validator',
	[ADDRESS.OwnableValidator]: 'Ownable Validator',
	[ADDRESS.SmartSession]: 'Smart Session',
	[ADDRESS.ScheduledTransfers]: 'Scheduled Transfers',
	[ADDRESS.ScheduledOrders]: 'Scheduled Orders',
}

export function addressToName(address: string) {
	if (!isAddress(address)) return 'Unknown'
	return ADDRESS_TO_NAME[address] || shortenAddress(address)
}
