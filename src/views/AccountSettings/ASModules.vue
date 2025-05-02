<script setup lang="ts">
import { fetchModules } from '@/lib/aa'
import { useAccounts } from '@/stores/useAccounts'
import { useNetwork } from '@/stores/useNetwork'
import { watchImmediate } from '@vueuse/core'
import { ERC7579_MODULE_TYPE } from 'sendop'

const { selectedAccount, isDeployed } = useAccounts()
const { client, clientNoBatch } = useNetwork()

const loading = ref(false)
const modules = ref<Record<string, string[]>>({})
const installedModules = ref<{ id: string; name: string; address: string }[]>([])

// Watch for account changes and fetch modules
watchImmediate(selectedAccount, async () => {
	if (!isDeployed.value || !selectedAccount.value?.address || !client.value) return

	loading.value = true
	try {
		const fetchedModules = await fetchModules(selectedAccount.value.address, clientNoBatch.value)
		modules.value = fetchedModules

		// Transform modules into the format we need for the UI
		installedModules.value = Object.entries(fetchedModules).flatMap(([typeId, addresses]) =>
			addresses.map(address => ({
				id: address,
				name: `${ERC7579_MODULE_TYPE[Number(typeId)]} (${address.slice(0, 6)}...${address.slice(-4)})`,
				address,
			})),
		)
	} catch (error) {
		console.error('Error fetching modules:', error)
	} finally {
		loading.value = false
	}
})

const onClickRemove = (moduleId: string) => {
	installedModules.value = installedModules.value.filter(m => m.id !== moduleId)
}
</script>

<template>
	<Card>
		<div class="space-y-6 p-6">
			<div v-if="loading" class="text-sm text-muted-foreground">Loading modules...</div>

			<div v-else class="space-y-4">
				<div v-if="!isDeployed" class="text-sm text-muted-foreground">Account is not deployed</div>
				<div v-else-if="installedModules.length === 0" class="text-sm text-muted-foreground">
					No modules installed
				</div>
				<div v-else class="grid gap-2">
					<div
						v-for="module in installedModules"
						:key="module.id"
						class="flex items-center justify-between p-3 border rounded-md"
					>
						<div>
							<div class="font-medium">{{ module.name }}</div>
							<div class="text-sm text-muted-foreground">{{ module.address }}</div>
						</div>
						<Button variant="outline" size="sm" @click="onClickRemove(module.id)"> Remove </Button>
					</div>
				</div>
			</div>
		</div>
	</Card>
</template>

<style lang="css" scoped></style>
