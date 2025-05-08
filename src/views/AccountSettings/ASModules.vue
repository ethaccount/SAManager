<script setup lang="ts">
import { fetchModules } from '@/lib/aa'
import { useAccount } from '@/stores/account/useAccount'
import { useNetwork } from '@/stores/network/useNetwork'
import { watchImmediate } from '@vueuse/core'
import { ADDRESS, ERC7579_MODULE_TYPE, isSameAddress } from 'sendop'
import { toast } from 'vue-sonner'

const props = defineProps<{
	isDeployed: boolean
}>()

const { selectedAccount } = useAccount()
const { client, clientNoBatch } = useNetwork()

const loading = ref(false)
const modules = ref<Record<string, string[]>>({})
const modulesByType = ref<Record<ERC7579_MODULE_TYPE, { id: string; address: string }[]>>({} as any)

// Module type labels mapping
const MODULE_TYPE_LABELS = {
	[ERC7579_MODULE_TYPE.VALIDATOR]: 'Validator Modules',
	[ERC7579_MODULE_TYPE.EXECUTOR]: 'Executor Modules',
	[ERC7579_MODULE_TYPE.HOOK]: 'Hook Modules',
	[ERC7579_MODULE_TYPE.FALLBACK]: 'Fallback Modules',
} as const

const SUPPORTED_MODULE_NAMES = {
	[ADDRESS.ECDSAValidator]: 'ECDSA Validator',
	[ADDRESS.WebAuthnValidator]: 'WebAuthn Validator',
	[ADDRESS.SmartSession]: 'Smart Session',
	[ADDRESS.OwnableValidator]: 'Ownable Validator',
}

// Helper function to get module name
const getModuleName = (address: string) => {
	return (
		Object.entries(SUPPORTED_MODULE_NAMES).find(([addr]) => isSameAddress(addr, address))?.[1] || 'Unknown Module'
	)
}

// Watch for account changes and fetch modules
watchImmediate(selectedAccount, async () => {
	if (!props.isDeployed || !selectedAccount.value?.address || !client.value) return

	loading.value = true
	try {
		const fetchedModules = await fetchModules(selectedAccount.value.address, clientNoBatch.value)
		modules.value = fetchedModules

		// Group modules by type
		const grouped = {} as Record<ERC7579_MODULE_TYPE, { id: string; address: string }[]>
		Object.entries(fetchedModules).forEach(([typeId, addresses]) => {
			const type = Number(typeId) as ERC7579_MODULE_TYPE
			grouped[type] = addresses.map(address => ({
				id: address,
				address,
			}))
		})
		modulesByType.value = grouped
	} catch (error) {
		console.error('Error fetching modules:', error)
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

// Helper to get available module types
const availableTypes = computed(() => {
	return Object.keys(modulesByType.value)
		.map(Number)
		.filter(type => modulesByType.value[type]?.length > 0)
})
</script>

<template>
	<Card>
		<div class="space-y-6 p-6">
			<div v-if="loading" class="text-sm text-muted-foreground">Loading modules...</div>

			<div v-else class="space-y-6">
				<div v-if="!isDeployed" class="text-sm text-muted-foreground">Account is not deployed</div>
				<div v-else-if="availableTypes.length === 0" class="text-sm text-muted-foreground">
					No modules installed
				</div>
				<template v-else>
					<div v-for="type in availableTypes" :key="type" class="space-y-3">
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
		</div>
	</Card>
</template>

<style lang="css" scoped></style>
