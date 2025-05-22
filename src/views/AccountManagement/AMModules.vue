<script setup lang="ts">
import { ModuleRecordModule, useAccountModule } from '@/lib/useAccountModule'
import { MODULE_TYPE_LABELS, ModuleType, SUPPORTED_MODULES, useModuleManagement } from '@/lib/useModuleManagement'
import { useAccount } from '@/stores/account/useAccount'
import { ERC7579_MODULE_TYPE, isSameAddress } from 'sendop'

const props = defineProps<{
	isDeployed: boolean
}>()

const { selectedAccount } = useAccount()

function getModuleName(address: string) {
	return (
		Object.values(SUPPORTED_MODULES).find(module => isSameAddress(module.address, address))?.name ||
		'Unknown Module'
	)
}

const { moduleRecord, loading, updateAccountModuleRecord, hasModules, installedModuleTypes } = useAccountModule()

// Watch for account changes and fetch modules
watchImmediate([() => props.isDeployed, selectedAccount], async () => {
	if (!props.isDeployed) return
	await updateAccountModuleRecord()
})

const onlyOneValidator = computed(() => {
	return moduleRecord.value[ERC7579_MODULE_TYPE.VALIDATOR]?.length === 1
})

// available modules for installation
const availableModules = computed(() => {
	return Object.entries(SUPPORTED_MODULES)
		.filter(
			([_, module]) =>
				!module.disabled &&
				!moduleRecord.value[module.type].find(m => isSameAddress(m.address, module.address)),
		)
		.map(([key]) => key as ModuleType)
})

const { operateValidator } = useModuleManagement()

const operatingModule = ref<string | null>(null)

async function onClickUninstall(recordModule: ModuleRecordModule) {
	try {
		operatingModule.value = recordModule.address
		// Find the module type from SUPPORTED_MODULES
		const moduleType = Object.entries(SUPPORTED_MODULES).find(([_, module]) =>
			isSameAddress(module.address, recordModule.address),
		)?.[0] as ModuleType

		if (!moduleType) {
			throw new Error(`Unknown module type for address: ${recordModule.address}`)
		}

		await operateValidator('uninstall', moduleType, {
			onSuccess: async () => {
				await updateAccountModuleRecord()
			},
		})
	} finally {
		operatingModule.value = null
	}
}

async function onClickInstall(module: ModuleType) {
	try {
		operatingModule.value = SUPPORTED_MODULES[module].address
		await operateValidator('install', module, {
			onSuccess: async () => {
				await updateAccountModuleRecord()
			},
		})
	} finally {
		operatingModule.value = null
	}
}

const showAvailableModules = computed(() => {
	if (!props.isDeployed) return false
	if (loading.value) return false
	if (availableModules.value.length === 0) return false
	return true
})
</script>

<template>
	<Card>
		<div class="space-y-6 p-6">
			<div v-if="loading" class="text-sm text-muted-foreground">Loading modules...</div>

			<div v-else class="space-y-6">
				<div v-if="!isDeployed" class="text-sm text-muted-foreground">Account is not deployed</div>
				<div v-else-if="!hasModules" class="text-sm text-muted-foreground">No modules installed</div>
				<template v-else>
					<div v-for="type in installedModuleTypes" :key="type" class="space-y-3">
						<h3 class="text-sm font-medium">{{ MODULE_TYPE_LABELS[type] }}</h3>
						<div class="grid gap-2">
							<div
								v-for="module in moduleRecord[type]"
								:key="module.id"
								class="flex items-center justify-between p-3 border rounded-md bg-card"
							>
								<div class="space-y-1">
									<div class="text-sm font-medium">{{ getModuleName(module.address) }}</div>
									<div class="text-xs text-muted-foreground break-all">{{ module.address }}</div>
								</div>
								<Button
									:disabled="onlyOneValidator || operatingModule !== null"
									:loading="operatingModule === module.address"
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
			</div>

			<!-- Available Modules Section -->
			<div v-if="showAvailableModules" class="space-y-3 mt-8 pt-6 border-t">
				<h3 class="text-base font-medium">Available Modules</h3>
				<div class="grid gap-3">
					<div
						v-for="module in availableModules"
						:key="module"
						class="flex items-center justify-between p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors"
					>
						<div class="space-y-1">
							<div class="text-sm font-medium">{{ SUPPORTED_MODULES[module].name }}</div>
							<div class="text-xs text-muted-foreground">{{ SUPPORTED_MODULES[module].description }}</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							:disabled="operatingModule !== null"
							:loading="operatingModule === SUPPORTED_MODULES[module].address"
							@click="onClickInstall(module)"
						>
							Install
						</Button>
					</div>
				</div>
			</div>
		</div>
	</Card>
</template>

<style lang="css" scoped></style>
