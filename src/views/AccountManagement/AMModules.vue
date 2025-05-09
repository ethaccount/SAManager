<script setup lang="ts">
import { fetchModules } from '@/lib/aa'
import { MODULE_TYPE_LABELS, ModuleType, SUPPORTED_MODULES, useModuleManagement } from '@/lib/useModuleManagement'
import { useAccount } from '@/stores/account/useAccount'
import { useNetwork } from '@/stores/network/useNetwork'
import { watchImmediate } from '@vueuse/core'
import { ERC7579_MODULE_TYPE, isSameAddress, TIERC7579Account__factory } from 'sendop'
import { toast } from 'vue-sonner'

const props = defineProps<{
	isDeployed: boolean
}>()

type ModuleRecord = Record<ERC7579_MODULE_TYPE, { id: string; address: string }[]>

const { selectedAccount } = useAccount()
const { client, clientNoBatch } = useNetwork()

const loading = ref(false)
const modules = ref<Record<string, string[]>>({})
const modulesByType = ref<ModuleRecord>(getDefaultModules())

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

function getModuleName(address: string) {
	return (
		Object.values(SUPPORTED_MODULES).find(module => isSameAddress(module.address, address))?.name ||
		'Unknown Module'
	)
}

// Watch for account changes and fetch modules
watchImmediate([() => props.isDeployed, selectedAccount], async () => {
	if (!props.isDeployed || !selectedAccount.value?.address || !clientNoBatch.value) return

	loading.value = true
	try {
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
		modulesByType.value = grouped

		// check if available modules are installed
		for (const module of Object.values(SUPPORTED_MODULES)) {
			const account = TIERC7579Account__factory.connect(accountAddress, client.value)
			const isInstalled = await account.isModuleInstalled(module.type, module.address, '0x')

			// if installed, and modulebytype doesn't have it, add it
			if (isInstalled && !modulesByType.value[module.type].find(m => m.address === module.address)) {
				modulesByType.value[module.type].push({
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
})

const onlyOneValidator = computed(() => {
	return modulesByType.value[ERC7579_MODULE_TYPE.VALIDATOR]?.length === 1
})

const onClickRemove = (moduleId: string, type: ERC7579_MODULE_TYPE) => {
	// Prevent removing the last validator module
	if (type === ERC7579_MODULE_TYPE.VALIDATOR && onlyOneValidator.value) {
		toast.error('Cannot remove the last validator module')
		return
	}
	modulesByType.value[type] = modulesByType.value[type]?.filter(m => m.id !== moduleId) || []
}

const hasModules = computed(() => {
	return Object.values(modulesByType.value).some(modules => modules.length > 0)
})

const installedModuleTypes = computed<ERC7579_MODULE_TYPE[]>(() => {
	return Object.keys(modulesByType.value)
		.map(Number)
		.filter(type => modulesByType.value[type]?.length > 0)
})

// available modules for installation
const availableModules = computed(() => {
	return Object.entries(SUPPORTED_MODULES)
		.filter(
			([_, module]) =>
				!module.disabled && !modulesByType.value[module.type].find(m => m.address === module.address),
		)
		.map(([key]) => key as ModuleType)
})

const onClickInstall = (module: ModuleType) => {
	useModuleManagement().installValidator(module)
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
								v-for="module in modulesByType[type]"
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
									@click="onClickRemove(module.id, type)"
								>
									Remove
								</Button>
							</div>
						</div>
					</div>
				</template>
			</div>

			<!-- Available Modules Section -->
			<div v-if="!loading" class="space-y-3 mt-8 pt-6 border-t">
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
