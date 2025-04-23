<script setup lang="ts">
import { toRoute } from '@/lib/router'

const route = useRoute()
</script>

<template>
	<CenterStageLayout>
		<div class="flex items-center justify-center mb-4">
			<RouterLink :to="toRoute('send-token')" class="mr-4" :class="{ underline: route.name === 'send-token' }">
				Token
			</RouterLink>
			<RouterLink :to="toRoute('send-raw')" :class="{ underline: route.name === 'send-raw' }"> Raw </RouterLink>
		</div>

		<slot />
	</CenterStageLayout>
</template>

<style lang="css" scoped></style>
