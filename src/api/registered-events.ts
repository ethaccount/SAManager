import { TESTNET_CHAIN_ID } from '@/stores/blockchain'
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

	const network = await client.getNetwork()
	const chainId = network.chainId
	const currentBlock = await client.getBlockNumber()

	let fromBlock = 0
	if (chainId.toString() === TESTNET_CHAIN_ID.BASE_SEPOLIA) {
		fromBlock = Math.max(0, currentBlock - 10000)
	}

	const events = (await webAuthnValidator.queryFilter(
		webAuthnValidator.filters.WebAuthnPublicKeyRegistered(null, authenticatorIdHash),
		fromBlock,
		currentBlock,
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

	const network = await client.getNetwork()
	const chainId = network.chainId
	const currentBlock = await client.getBlockNumber()

	let fromBlock = 0
	if (chainId.toString() === TESTNET_CHAIN_ID.BASE_SEPOLIA) {
		fromBlock = Math.max(0, currentBlock - 10000)
	}

	const events = (await validator.queryFilter(
		validator.filters.OwnerRegistered(null, ownerAddress),
		fromBlock,
		currentBlock,
	)) as EventLog[]

	const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber)
	return sortedEvents.map(event => event.args[0]) as string[]
}
