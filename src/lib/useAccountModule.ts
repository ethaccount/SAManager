import { fetchModules } from '@/lib/aa'
import { SUPPORTED_MODULES } from '@/lib/useModuleManagement'
import { useAccount } from '@/stores/account/useAccount'
import { useNetwork } from '@/stores/network/useNetwork'
import { ERC7579_MODULE_TYPE, TIERC7579Account__factory } from 'sendop'

export type ModuleRecordModule = { id: string; address: string }
export type ModuleRecord = Record<ERC7579_MODULE_TYPE, ModuleRecordModule[]>

export function useAccountModule() {
	const loading = ref(false)
	const modules = ref<Record<string, string[]>>({})
	const moduleRecord = ref<ModuleRecord>(getDefaultModules())

	const { selectedAccount } = useAccount()
	const { client, clientNoBatch } = useNetwork()

	async function updateAccountModuleRecord() {
		loading.value = true
		try {
			if (!selectedAccount.value?.address || !clientNoBatch.value) return
			const accountAddress = selectedAccount.value.address

			const fetchedModules = await fetchModules(accountAddress, clientNoBatch.value)
			modules.value = fetchedModules

			// Group modules by type
			const grouped = getDefaultModules()
			Object.entries(fetchedModules).forEach(([typeId, addresses]) => {
				const type = Number(typeId) as ERC7579_MODULE_TYPE
				grouped[type] = addresses.map(address => ({
					id: address,
					address,
				}))
			})
			moduleRecord.value = grouped

			// check if available modules are installed
			for (const module of Object.values(SUPPORTED_MODULES)) {
				const account = TIERC7579Account__factory.connect(accountAddress, client.value)
				const isInstalled = await account.isModuleInstalled(module.type, module.address, '0x')

				// if installed, and modulebytype doesn't have it, add it
				if (isInstalled && !moduleRecord.value[module.type].find(m => m.address === module.address)) {
					moduleRecord.value[module.type].push({
						id: module.address,
						address: module.address,
					})
				}
			}
		} catch (e: unknown) {
			throw new Error(`Error fetching modules: ${e}`)
		} finally {
			loading.value = false
		}
	}

	const hasModules = computed(() => {
		return Object.values(moduleRecord.value).some(modules => modules.length > 0)
	})

	const installedModuleTypes = computed<ERC7579_MODULE_TYPE[]>(() => {
		return Object.keys(moduleRecord.value)
			.map(Number)
			.filter(type => moduleRecord.value[type]?.length > 0)
	})

	return {
		moduleRecord,
		modules,
		loading,
		hasModules,
		installedModuleTypes,
		updateAccountModuleRecord,
	}
}

function getDefaultModules(): ModuleRecord {
	return {
		[ERC7579_MODULE_TYPE.VALIDATOR]: [],
		[ERC7579_MODULE_TYPE.EXECUTOR]: [],
		[ERC7579_MODULE_TYPE.HOOK]: [],
		[ERC7579_MODULE_TYPE.FALLBACK]: [],
		[ERC7579_MODULE_TYPE.PREVALIDATION_HOOK_ERC1271]: [],
		[ERC7579_MODULE_TYPE.PREVALIDATION_HOOK_ERC4337]: [],
		[ERC7579_MODULE_TYPE.STATELESS_VALIDATOR]: [],
	}
}
