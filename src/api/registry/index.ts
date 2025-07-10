import { JsonRpcProvider } from 'ethers'
import { ADDRESS, Registry__factory } from 'sendop'

/**
 * function findTrustedAttesters(address smartAccount) public view returns (address[] memory attesters)
 */
export async function findTrustedAttesters(client: JsonRpcProvider, accountAddress: string): Promise<string[]> {
	const attesters = await Registry__factory.connect(ADDRESS.Registry, client).findTrustedAttesters(accountAddress)
	return attesters
}
