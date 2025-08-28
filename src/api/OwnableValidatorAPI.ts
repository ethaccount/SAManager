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

	static async getThreshold(client: JsonRpcProvider, account: string) {
		const contract = new Contract(
			ADDRESS.OwnableValidator,
			['function threshold(address account) view returns (uint256)'],
			client,
		)

		return (await contract.threshold(account)) as number
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
			throw new Error('Owner already exists')
		}

		return new Interface(['function addOwner(address owner)']).encodeFunctionData('addOwner', [owner])
	}

	static async encodeRemoveOwner(client: JsonRpcProvider, account: string, owner: string) {
		if (!(await this.isOwner(client, account, owner))) {
			throw new Error('Owner does not exist')
		}

		const prevOwner = await this.getPrevOwner(client, account, owner)

		return new Interface(['function removeOwner(address prevOwner, address owner)']).encodeFunctionData(
			'removeOwner',
			[prevOwner, owner],
		)
	}

	static async getPrevOwner(client: JsonRpcProvider, account: string, ownerToRemove: string): Promise<string> {
		const owners = await this.getOwners(client, account)

		// SENTINEL address (represents the head of the linked list)
		const SENTINEL = '0x0000000000000000000000000000000000000001'

		// If removing the first owner in the list, use SENTINEL
		if (isSameAddress(owners[0], ownerToRemove)) {
			return SENTINEL
		}

		// Find the previous owner by iterating through the list
		for (let i = 1; i < owners.length; i++) {
			if (isSameAddress(owners[i], ownerToRemove)) {
				return owners[i - 1]
			}
		}

		throw new Error(`Previous owner not found in owners list`)
	}
}
