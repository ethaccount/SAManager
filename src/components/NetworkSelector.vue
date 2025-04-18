<script setup lang="ts">
import { CHAIN_NAME } from '@/config'
import { useBlockchain } from '@/stores/useBlockchain'

const { chainId, chainIds } = useBlockchain()
</script>

<template>
	<Select v-model="chainId">
		<SelectTrigger class="w-[120px]">
			<SelectValue />
		</SelectTrigger>
		<SelectContent>
			<SelectGroup>
				<SelectItem v-for="id in chainIds" :value="id" :key="id">
					{{ CHAIN_NAME[id] }}
				</SelectItem>
			</SelectGroup>
		</SelectContent>
	</Select>
</template>

<style lang="css" scoped></style>
