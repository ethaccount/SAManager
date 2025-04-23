<script setup lang="ts">
import { CHAIN_NAME, CHAIN_ID } from '@/config'
import { useBlockchain } from '@/stores/useBlockchain'
import { Network } from 'lucide-vue-next'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { Button } from '@/components/ui/button'

const breakpoints = useBreakpoints(breakpointsTailwind)
const { chainId, chainIds } = useBlockchain()

function selectNetwork(id: CHAIN_ID) {
	chainId.value = id
}
</script>

<template>
	<!-- Desktop: Select -->
	<Select v-if="!breakpoints.isSmaller('sm')" v-model="chainId">
		<SelectTrigger class="w-[120px] h-[36px]">
			<SelectValue>
				<span>{{ CHAIN_NAME[chainId] }}</span>
			</SelectValue>
		</SelectTrigger>
		<SelectContent>
			<SelectGroup>
				<SelectItem v-for="id in chainIds" :value="id" :key="id">
					{{ CHAIN_NAME[id] }}
				</SelectItem>
			</SelectGroup>
		</SelectContent>
	</Select>

	<!-- Mobile: Popover -->
	<Popover v-else>
		<PopoverTrigger asChild>
			<Button variant="outline" size="icon" class="w-10 h-10 rounded-full p-0">
				<Network class="w-5 h-5" />
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
