<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { CHAIN_ID, CHAIN_NAME } from '@/config'
import { useBlockchain } from '@/stores/useBlockchain'
import { ref } from 'vue'

const { chainId, chainIds } = useBlockchain()
const isOpen = ref(false)

function selectNetwork(id: CHAIN_ID) {
	chainId.value = id
	isOpen.value = false // Close popover after selection
}
</script>

<template>
	<Popover v-model:open="isOpen">
		<PopoverTrigger as-child>
			<Button variant="outline">
				{{ CHAIN_NAME[chainId] }}
			</Button>
		</PopoverTrigger>

		<PopoverContent class="w-40 p-1">
			<div class="flex flex-col gap-1">
				<Button
					v-for="id in chainIds"
					:key="id"
					variant="ghost"
					:class="['justify-start', chainId === id ? 'bg-accent' : '']"
					@click="selectNetwork(id)"
				>
					{{ CHAIN_NAME[id] }}
				</Button>
			</div>
		</PopoverContent>
	</Popover>
</template>

<style lang="css" scoped></style>
