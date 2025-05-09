<script setup lang="ts">
import { ModuleRecordModule, useAccountModule } from '@/lib/useAccountModule'
import { MODULE_TYPE_LABELS, ModuleType, SUPPORTED_MODULES, useModuleManagement } from '@/lib/useModuleManagement'
import { useAccount } from '@/stores/account/useAccount'
import { watchImmediate } from '@vueuse/core'
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
				!module.disabled && !moduleRecord.value[module.type].find(m => m.address === module.address),
		)
		.map(([key]) => key as ModuleType)
})

async function onClickUninstall(_recordModule: ModuleRecordModule) {
	// TODO
	// useModuleManagement().uninstallValidator(module.address)
}

async function onClickInstall(module: ModuleType) {
	await useModuleManagement().installValidator(module)
}
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
									:disabled="onlyOneValidator"
									variant="outline"
									size="sm"
									@click="onClickUninstall(module)"
								>
									Remove
								</Button>
							</div>
						</div>
					</div>
				</template>
			</div>

			<!-- Available Modules Section -->
			<div v-if="!loading && availableModules.length > 0" class="space-y-3 mt-8 pt-6 border-t">
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
						<Button variant="outline" size="sm" @click="onClickInstall(module)"> Install </Button>
					</div>
				</div>
			</div>
		</div>
	</Card>
</template>

<style lang="css" scoped></style>
