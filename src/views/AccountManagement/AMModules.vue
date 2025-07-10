<script setup lang="ts">
import { addressToName } from '@/lib/addressToName'
import { ACCOUNT_SUPPORTED_INITIAL_VALIDATION } from '@/lib/accounts/account-specific'
import { MODULE_TYPE_LABELS } from '@/lib/modules/supported-modules'
import { ModuleRecordModule, useAccountModule } from '@/lib/modules/useAccountModule'
import { useValidatorManagement } from '@/lib/modules/useValidatorManagement'
import { ValidationMethodName } from '@/lib/validations/ValidationMethod'
import { ImportedAccount } from '@/stores/account/account'
import { shortenAddress } from '@vue-dapp/core'
import { getAddress } from 'ethers'
import { Loader2 } from 'lucide-vue-next'
import { ADDRESS, ERC7579_MODULE_TYPE, isSameAddress } from 'sendop'

const props = defineProps<{
	selectedAccount: ImportedAccount
	isDeployed: boolean
	isModular: boolean
}>()

const {
	moduleRecord,
	loading,
	error: fetchModulesError,
	fetchAccountModules,
	hasModules,
	installedModuleTypes,
} = useAccountModule()

const {
	installECDSAValidator,
	installWebAuthnValidator,
	installOwnableValidator,
	uninstallECDSAValidator,
	uninstallWebAuthnValidator,
	uninstallOwnableValidator,
} = useValidatorManagement()

onMounted(async () => {
	if (!props.isDeployed) return
	if (!props.isModular) return
	await fetchAccountModules()
})

const onlyOneValidator = computed<boolean>(() => {
	return moduleRecord.value[ERC7579_MODULE_TYPE.VALIDATOR]?.length === 1
})

// Available modules that can be installed (only validators for now)
const availableModules = computed<{ address: string; name: ValidationMethodName }[]>(() => {
	const installableModules: { address: string; name: ValidationMethodName }[] = [
		{ address: ADDRESS.ECDSAValidator, name: 'ECDSAValidator' },
		{ address: ADDRESS.WebAuthnValidator, name: 'WebAuthnValidator' },
		{ address: ADDRESS.OwnableValidator, name: 'OwnableValidator' },
	]

	// Get supported validation methods for the current account type
	const supportedValidations = ACCOUNT_SUPPORTED_INITIAL_VALIDATION[props.selectedAccount.accountId] || []
	const supportedValidationNames = new Set(supportedValidations.map(v => v.name))

	return installableModules.filter(module => {
		// Check if module is already installed
		const isInstalled = moduleRecord.value[ERC7579_MODULE_TYPE.VALIDATOR]?.find(m =>
			isSameAddress(m.address, module.address),
		)
		if (isInstalled) return false

		// Check if module is supported by the account type
		return supportedValidationNames.has(module.name)
	})
})

const operatingModule = ref<string | null>(null)

async function onClickInstall(moduleAddress: string) {
	try {
		operatingModule.value = moduleAddress

		const onSuccess = async () => {
			await fetchAccountModules()
		}

		// Call the appropriate install function based on module address
		if (isSameAddress(moduleAddress, ADDRESS.ECDSAValidator)) {
			await installECDSAValidator({ onSuccess })
		} else if (isSameAddress(moduleAddress, ADDRESS.WebAuthnValidator)) {
			await installWebAuthnValidator({ onSuccess })
		} else if (isSameAddress(moduleAddress, ADDRESS.OwnableValidator)) {
			await installOwnableValidator({ onSuccess })
		} else {
			throw new Error(`Unsupported module address: ${moduleAddress}`)
		}
	} finally {
		operatingModule.value = null
	}
}

async function onClickUninstall(recordModule: ModuleRecordModule) {
	try {
		operatingModule.value = recordModule.address

		const onSuccess = async () => {
			await fetchAccountModules()
		}

		// Call the appropriate uninstall function based on module address
		if (isSameAddress(recordModule.address, ADDRESS.ECDSAValidator)) {
			await uninstallECDSAValidator({ onSuccess })
		} else if (isSameAddress(recordModule.address, ADDRESS.WebAuthnValidator)) {
			await uninstallWebAuthnValidator({ onSuccess })
		} else if (isSameAddress(recordModule.address, ADDRESS.OwnableValidator)) {
			await uninstallOwnableValidator({ onSuccess })
		} else {
			throw new Error(`Unsupported module address: ${recordModule.address}`)
		}
	} finally {
		operatingModule.value = null
	}
}

const showAvailableModules = computed(() => {
	if (!props.isDeployed) return false
	if (loading.value) return false
	if (fetchModulesError.value) return false
	if (availableModules.value.length === 0) return false
	return true
})
</script>

<template>
	<Card>
		<div class="space-y-6 p-6">
			<div v-if="!isDeployed" class="text-sm text-muted-foreground">Account is not deployed</div>
			<div v-else-if="!isModular" class="text-sm text-muted-foreground">Account is not modular</div>
			<div v-else-if="loading" class="flex justify-center py-8">
				<Loader2 class="w-6 h-6 animate-spin text-primary" />
			</div>

			<!-- is deployed and modular -->
			<div v-else class="space-y-6">
				<div v-if="fetchModulesError" class="error-section">
					{{ fetchModulesError }}
				</div>
				<div v-else-if="!hasModules" class="text-sm text-muted-foreground">No modules installed</div>
				<template v-else>
					<!-- Installed Modules -->
					<div v-for="type in installedModuleTypes" :key="type" class="space-y-3">
						<h3 class="text-sm font-medium">{{ MODULE_TYPE_LABELS[type] }}</h3>
						<div class="grid gap-2">
							<div
								v-for="module in moduleRecord[type]"
								:key="module.id"
								class="flex items-center justify-between p-3 border rounded-md bg-card"
							>
								<div class="space-y-1">
									<div class="text-sm font-medium">
										{{ addressToName(getAddress(module.address)) }}
									</div>
									<div class="flex items-center gap-1 text-xs text-muted-foreground">
										<div>{{ shortenAddress(module.address) }}</div>
										<div class="flex items-center gap-1">
											<CopyButton size="xs" :address="module.address" />
											<AddressLinkButton size="xs" :address="module.address" />
										</div>
									</div>
								</div>
								<Button
									:disabled="onlyOneValidator || operatingModule !== null"
									:loading="!!operatingModule && isSameAddress(operatingModule, module.address)"
									variant="outline"
									size="sm"
									@click="onClickUninstall(module)"
								>
									Uninstall
								</Button>
							</div>
						</div>
					</div>
				</template>

				<!-- Available Modules Section -->
				<div v-if="showAvailableModules" class="space-y-3 mt-8 pt-6 border-t">
					<h3 class="text-sm font-medium">Available Modules</h3>
					<div class="grid gap-3">
						<div
							v-for="module in availableModules"
							:key="module.address"
							class="flex items-center justify-between p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors"
						>
							<div class="space-y-1">
								<div class="text-sm font-medium">{{ module.name }}</div>
								<div class="text-xs text-muted-foreground">
									{{ shortenAddress(module.address) }}
								</div>
							</div>
							<Button
								variant="outline"
								size="sm"
								:disabled="operatingModule !== null"
								:loading="!!operatingModule && isSameAddress(operatingModule, module.address)"
								@click="onClickInstall(module.address)"
							>
								Install
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Card>
</template>

<style lang="css" scoped></style>
