import { shortenAddress } from '@vue-dapp/core'
import { isAddress } from 'ethers'
import { ADDRESS, ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS, KernelAPI, NexusAPI, Safe7579API } from 'sendop'
import { AccountId } from './accounts'
import { EMAIL_RECOVERY_EXECUTOR_ADDRESS } from './email-recovery'

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
	[EMAIL_RECOVERY_EXECUTOR_ADDRESS]: 'Email Recovery Executor',

	// accounts
	[KernelAPI.implementationAddress]: AccountId['kernel.advanced.v0.3.3'],
	[NexusAPI.implementationAddress]: AccountId['biconomy.nexus.1.0.2'],
	[Safe7579API.implementationAddress]: AccountId['rhinestone.safe7579.v1.0.0'],
	[ADDRESS.Simple7702AccountV08]: 'infinitism.Simple7702Account.0.8.0',
	'0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00': 'Uniswap.Calibur.1.0.0',
	'0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B': 'MetaMask.EIP7702StatelessDeleGator.1.3.0',
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
