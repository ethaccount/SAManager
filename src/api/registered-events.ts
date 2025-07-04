import { Contract, EventLog, JsonRpcProvider } from 'ethers'
import { ADDRESS } from 'sendop'

export async function fetchWebAuthnRegisteredEvent(
	client: JsonRpcProvider,
	authenticatorIdHash: string,
): Promise<string[]> {
	const webAuthnValidator = new Contract(
		ADDRESS.WebAuthnValidator,
		[
			'event WebAuthnPublicKeyRegistered(address indexed kernel, bytes32 indexed authenticatorIdHash, uint256 pubKeyX, uint256 pubKeyY)',
		],
		client,
	)

	const events = (await webAuthnValidator.queryFilter(
		webAuthnValidator.filters.WebAuthnPublicKeyRegistered(null, authenticatorIdHash),
	)) as EventLog[]

	const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber)
	return sortedEvents.map(event => event.args[0]) as string[]
}

export async function fetchECDSAValidatorRegisteredEvent(
	client: JsonRpcProvider,
	ownerAddress: string,
): Promise<string[]> {
	const validator = new Contract(
		ADDRESS.ECDSAValidator,
		['event OwnerRegistered(address indexed kernel, address indexed owner)'],
		client,
	)
	const events = (await validator.queryFilter(validator.filters.OwnerRegistered(null, ownerAddress))) as EventLog[]

	const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber)
	return sortedEvents.map(event => event.args[0]) as string[]
}
