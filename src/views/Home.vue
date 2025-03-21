<script setup lang="ts">
import { fetchModules } from '@/lib/aa'
import { useBlockchain } from '@/stores/useBlockchain'
import { useSA } from '@/stores/useSA'
import { ERC7579_MODULE_TYPE } from 'sendop'

const modules = ref<Record<string, string[]>>({})

const { account, isConnected } = useSA()
const { client, clientNoBatch } = useBlockchain()

const loading = ref(false)
watch(
	account,
	async () => {
		if (!isConnected.value) return
		if (!account.value?.address) {
			throw new Error('Account not found')
		}
		if (!client.value) {
			throw new Error('Client not found')
		}

		loading.value = true
		try {
			modules.value = await fetchModules(account.value.address, clientNoBatch.value)
		} catch (error) {
			console.error('Error fetching modules:', error)
		} finally {
			loading.value = false
		}
	},
	{ immediate: true },
)

const getModuleTypeName = (typeId: number): string => {
	return ERC7579_MODULE_TYPE[typeId] || 'Unknown'
}
</script>

<template>
	<div>
		<div v-if="loading">Loading modules...</div>
		<div v-else-if="Object.keys(modules).length > 0">
			<div v-for="(addresses, typeId) in modules" :key="typeId" class="module-group">
				<div>{{ getModuleTypeName(Number(typeId)) }}</div>
				<ul class="flex flex-wrap gap-2">
					<li v-for="address in addresses" :key="address">
						<Address :address="address" />
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>
