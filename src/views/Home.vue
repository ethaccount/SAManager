<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchModules } from '@/core/aa'
import { useAccount } from '@/stores/account'
import { useBlockchain } from '@/stores/useBlockchainStore'
import { shortenAddress } from '@vue-dapp/core'

const modules = ref<Record<string, string[]>>({})

const { account, isConnected } = useAccount()
const { client } = useBlockchain()

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
			modules.value = await fetchModules(account.value.address, client.value)
		} catch (error) {
			console.error('Error fetching modules:', error)
		} finally {
			loading.value = false
		}
	},
	{ immediate: true },
)

const ModuleType = {
	1: 'Validation',
	2: 'Execution',
	3: 'Fallback',
	4: 'Hooks',
}
</script>

<template>
	<div>
		<div v-if="loading">Loading modules...</div>
		<div v-else-if="Object.keys(modules).length > 0">
			<div v-for="(addresses, typeId) in modules" :key="typeId" class="module-group">
				<div>{{ ModuleType[typeId] }}</div>
				<ul class="list-disc list-inside">
					<li v-for="address in addresses" :key="address">
						{{ shortenAddress(address) }}
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>
