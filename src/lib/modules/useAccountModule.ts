import { fetchModules } from '@/lib/modules/fetch-modules'
import { SUPPORTED_MODULES } from '@/lib/modules/supported-modules'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { ERC7579_MODULE_TYPE, IERC7579Account__factory, isSameAddress } from 'sendop'

export type ModuleRecordModule = { type: ERC7579_MODULE_TYPE; address: string }
export type ModuleRecord = Record<ERC7579_MODULE_TYPE, ModuleRecordModule[]>

export function useAccountModule() {
	const loading = ref(false)
	const error = ref<string | null>(null)
	const modules = ref<Record<string, string[]>>({})
	const moduleRecord = ref<ModuleRecord>(getDefaultModules())

	const { selectedAccount } = useAccount()
	const { client, tenderlyClient } = useBlockchain()

	const hasModules = computed(() => {
		return Object.values(moduleRecord.value).some(modules => modules.length > 0)
	})

	const installedModuleTypes = computed<ERC7579_MODULE_TYPE[]>(() => {
		return Object.keys(moduleRecord.value)
			.map(Number)
			.filter(type => moduleRecord.value[type]?.length > 0)
	})

	/**
	 * fetch the modules for the selected account
	 * @returns
	 */
	async function fetchAccountModules() {
		loading.value = true
		error.value = null
		moduleRecord.value = getDefaultModules()

		try {
			// throw new Error('test')

			if (!selectedAccount.value?.address || !tenderlyClient.value) return
			const accountAddress = selectedAccount.value.address

			const fetchedModules = await fetchModules(accountAddress, tenderlyClient.value)
			modules.value = fetchedModules

			// Group modules by type
			const grouped = getDefaultModules()
			Object.entries(fetchedModules).forEach(([typeId, addresses]) => {
				const type = Number(typeId) as ERC7579_MODULE_TYPE
				grouped[type] = addresses.map(address => ({
					type,
					address,
				}))
			})
			moduleRecord.value = grouped

			// check if available modules are installed
			for (const module of Object.values(SUPPORTED_MODULES)) {
				const account = IERC7579Account__factory.connect(accountAddress, client.value)
				const isInstalled = await account.isModuleInstalled(module.type, module.address, '0x')

				// if installed, and module by type doesn't have it, add it
				if (
					isInstalled &&
					!moduleRecord.value[module.type].find(m => isSameAddress(m.address, module.address))
				) {
					moduleRecord.value[module.type].push({
						type: module.type,
						address: module.address,
					})
				}
			}

			// TODO: if the account has a validator but the validation option is not set, set it to the account's vOptions
			// for (const module of moduleRecord.value[ERC7579_MODULE_TYPE.VALIDATOR]) {
			// 	// if there's no validation option for the module, add it to the vOptions
			// 	if (
			// 		!selectedAccount.value.vOptions.some((vOption: ValidationOption) => {
			// 			const validatorAddress = SUPPORTED_VALIDATION_OPTIONS[vOption.type].validatorAddress
			// 			if (validatorAddress) {
			// 				return isSameAddress(validatorAddress, module.address)
			// 			}
			// 			return false
			// 		})
			// 	) {
			// 		// the validator module is not set in the vOptions, add it
			// 		if (isSameAddress(module.address, SUPPORTED_VALIDATION_OPTIONS['EOA-Owned'].validatorAddress)) {
			// 			selectedAccount.value.vOptions.push({
			// 				type: 'EOA-Owned',
			// 				identifier: '', // how to get the signer address?
			// 			})
			// 			return
			// 		}

			// 		if (isSameAddress(module.address, SUPPORTED_VALIDATION_OPTIONS['Passkey'].validatorAddress)) {
			// 			selectedAccount.value.vOptions.push({
			// 				type: 'Passkey',
			// 				identifier: '', // how to get the credential id?
			// 			})
			// 			return
			// 		}
			// 	}
			// }
		} catch (e: unknown) {
			console.error(e)
			error.value = `Failed to fetch modules: ${e instanceof Error ? e.message : String(e)}`
		} finally {
			loading.value = false
		}
	}

	return {
		moduleRecord,
		modules,
		loading,
		error,
		hasModules,
		installedModuleTypes,
		fetchAccountModules,
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
