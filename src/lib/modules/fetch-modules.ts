import { TESTNET_CHAIN_ID } from '@/stores/blockchain'
import { Contract, EventLog, JsonRpcProvider } from 'ethers'

export async function fetchModules(address: string, client: JsonRpcProvider) {
	const contract = new Contract(
		address,
		[
			'event ModuleInstalled(uint256 moduleTypeId, address module)',
			'event ModuleUninstalled(uint256 moduleTypeId, address module)',
		],
		client,
	)

	const currentBlock = await client.getBlockNumber()
	const network = await client.getNetwork()
	const chainId = network.chainId

	// SPECIAL CASE: For base sepolia, we need to fetch events from the last 10000 blocks to prevent "block range is too large" error
	let fromBlock = 0
	if (chainId.toString() === TESTNET_CHAIN_ID.BASE_SEPOLIA) {
		fromBlock = Math.max(0, currentBlock - 10000)
	}

	// Fetch install and uninstall events (using block 0 as starting point)
	const installEvents = await contract.queryFilter(contract.filters.ModuleInstalled, fromBlock, currentBlock)
	const uninstallEvents = await contract.queryFilter(contract.filters.ModuleUninstalled, fromBlock, currentBlock)

	// Combine and sort events by block number and transaction index
	const allEvents = [...installEvents, ...uninstallEvents].sort((a, b) => {
		if (a.blockNumber !== b.blockNumber) {
			return a.blockNumber - b.blockNumber
		}
		return a.transactionIndex - b.transactionIndex
	}) as EventLog[]

	// Track currently installed modules (moduleTypeId => Set of module addresses)
	const installedModules = new Map<string, Set<string>>()

	// Process events to build current state
	for (const event of allEvents) {
		const { moduleTypeId, module } = event.args
		const typeId = moduleTypeId.toString()
		const action = event.fragment.name === 'ModuleInstalled' ? 'Installed' : 'Uninstalled'

		if (action === 'Installed') {
			if (!installedModules.has(typeId)) {
				installedModules.set(typeId, new Set())
			}
			installedModules.get(typeId)!.add(module)
		} else {
			installedModules.get(typeId)?.delete(module)
			if (installedModules.get(typeId)?.size === 0) {
				installedModules.delete(typeId)
			}
		}
	}

	// Convert Map to a more JSON-friendly format
	const result: Record<string, string[]> = {}
	for (const [typeId, modules] of installedModules) {
		result[typeId] = Array.from(modules)
	}

	return result
}
