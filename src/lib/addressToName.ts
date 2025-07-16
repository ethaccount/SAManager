import { shortenAddress } from '@vue-dapp/core'
import { isAddress } from 'ethers'
import { ADDRESS, ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS } from 'sendop'

export const DEPRECATED_WEB_AUTHN_VALIDATOR_ADDRESS = '0xD990393C670dCcE8b4d8F858FB98c9912dBFAa06'

const ADDRESS_TO_NAME: Record<string, string> = {
	[ENTRY_POINT_V07_ADDRESS]: 'Entrypoint v0.7',
	[ENTRY_POINT_V08_ADDRESS]: 'Entrypoint v0.8',
	[ADDRESS.ECDSAValidator]: 'ECDSA Validator',
	[ADDRESS.WebAuthnValidator]: 'WebAuthn Validator',
	[ADDRESS.OwnableValidator]: 'Ownable Validator',
	[ADDRESS.SmartSession]: 'Smart Session',
	[ADDRESS.ScheduledTransfers]: 'Scheduled Transfers',
	[ADDRESS.ScheduledOrders]: 'Scheduled Orders',
	[DEPRECATED_WEB_AUTHN_VALIDATOR_ADDRESS]: 'WebAuthn Validator (Deprecated)',
}

const NAME_TO_ADDRESS: Record<string, string> = Object.entries(ADDRESS_TO_NAME).reduce(
	(acc, [address, name]) => {
		acc[name] = address
		return acc
	},
	{} as Record<string, string>,
)

export function addressToName(address: string) {
	if (!isAddress(address)) return 'Unknown'
	return ADDRESS_TO_NAME[address] || shortenAddress(address)
}

export function findAddress(name: string): string | undefined {
	return NAME_TO_ADDRESS[name]
}
