import { fetchModules } from '@/lib/modules/fetch-modules'
import { SUPPORTED_MODULES } from '@/lib/modules/supported-modules'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { ERC7579_MODULE_TYPE, IERC7579Account__factory, isSameAddress } from 'sendop'
import { getErrorMessage } from '../error'
import { deserializeValidationMethod } from '../validations'
import type { ValidationMethodData } from '../validations/types'

export type ModuleRecordModule = { type: ERC7579_MODULE_TYPE; address: string }
export type ModuleRecord = Record<ERC7579_MODULE_TYPE, ModuleRecordModule[]>

/**
 * Removes validation methods that don't have corresponding validator modules installed
 * @param vMethods - Array of validation method data
 * @param validators - Array of installed validator modules
 * @returns Filtered array of validation methods
 */
export function removeInvalidValidationMethods(
	vMethods: ValidationMethodData[],
	validators: ModuleRecordModule[],
): ValidationMethodData[] {
	return vMethods.filter(vMethodData => {
		const vMethod = deserializeValidationMethod(vMethodData)

		// If the validation method doesn't have a validator address, keep it
		if (!vMethod.validatorAddress) return true

		// Check if there's a corresponding validator module
		return validators.some(validator => isSameAddress(validator.address, vMethod.validatorAddress!))
	})
}

export function useAccountModule() {
	const loading = ref(false)
	const error = ref<string | null>(null)
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
			if (!selectedAccount.value) {
				throw new Error('No account selected')
			}

			if (!tenderlyClient.value) {
				throw new Error('Tenderly client not found')
			}

			const accountAddress = selectedAccount.value.address

			// Check each module in SUPPORTED_MODULES to see if it is installed
			const account = IERC7579Account__factory.connect(accountAddress, client.value)
			const supportedModules = Object.values(SUPPORTED_MODULES)
			const moduleChecks = supportedModules.map(module =>
				account.isModuleInstalled(module.type, module.address, '0x'),
			)

			const results = await Promise.all(moduleChecks)

			results.forEach((isInstalled, index) => {
				const module = supportedModules[index]

				// Add module to moduleRecord if it is installed and not already in the moduleRecord
				if (
					isInstalled &&
					!moduleRecord.value[module.type].find(m => isSameAddress(m.address, module.address))
				) {
					moduleRecord.value[module.type].push({
						type: module.type,
						address: module.address,
					})
				}
			})

			// TODO: if the account has a validation method but doesn't have a validator module, remove the validation method
			// Warning: Do not remove validation methods just because a validator module is missing on this chain or not yet deployed!
			// const validators = moduleRecord.value[ERC7579_MODULE_TYPE.VALIDATOR]
			// selectedAccount.value.vMethods = removeInvalidValidationMethods(selectedAccount.value.vMethods, validators)

			// updateModuleRecordByFetchingModules(accountAddress)
		} catch (e: unknown) {
			console.error(`Error fetching modules`, e)
			error.value = `Error fetching modules: ${getErrorMessage(e)}`
		} finally {
			loading.value = false
		}
	}

	async function _updateModuleRecordByFetchingModules(accountAddress: string) {
		if (!tenderlyClient.value) {
			throw new Error('Tenderly client not found')
		}

		// Fetch modules by event logs
		const fetchedModules = await fetchModules(accountAddress, tenderlyClient.value)

		Object.entries(fetchedModules).forEach(([typeId, addresses]) => {
			const type = Number(typeId) as ERC7579_MODULE_TYPE
			moduleRecord.value[type] = [
				...moduleRecord.value[type],
				...addresses.map(address => ({
					type,
					address,
				})),
			]
		})
	}

	return {
		moduleRecord,
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
