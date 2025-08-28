import { Contract, Interface, JsonRpcProvider } from 'ethers'
import { ADDRESS, isSameAddress } from 'sendop'

export class OwnableValidatorAPI {
	static async getOwners(client: JsonRpcProvider, account: string) {
		const contract = new Contract(
			ADDRESS.OwnableValidator,
			['function getOwners(address account) view returns (address[])'],
			client,
		)

		return (await contract.getOwners(account)) as string[]
	}

	static async isOwner(client: JsonRpcProvider, account: string, owner: string) {
		const owners = await this.getOwners(client, account)

		const currentOwnerIndex = owners.findIndex((o: string) => isSameAddress(o, owner))

		if (currentOwnerIndex !== -1) {
			return true
		}

		return false
	}

	static async encodeAddOwner(client: JsonRpcProvider, account: string, owner: string) {
		if (await this.isOwner(client, account, owner)) {
			throw new Error('[OwnableValidator#encodeAddOwner] Owner already exists')
		}

		return new Interface(['function addOwner(address owner)']).encodeFunctionData('addOwner', [owner])
	}
}
