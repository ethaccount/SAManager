import { Contract, JsonRpcProvider } from 'ethers'

export async function fetchAccountId(address: string, client: JsonRpcProvider) {
	const contract = new Contract(address, ['function accountId() external pure returns (string memory)'], client)
	return await contract.accountId()
}
