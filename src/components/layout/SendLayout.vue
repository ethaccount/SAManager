<script setup lang="ts">
import { toRoute } from '@/lib/router'

const route = useRoute()

const tabs = [
	{ name: 'Token', route: 'send-token' },
	{ name: 'Raw', route: 'send-raw' },
]
</script>

<template>
	<CenterStageLayout>
		<nav class="flex space-x-1 rounded-xl bg-secondary p-1 mb-4 max-w-xs mx-auto">
			<RouterLink
				v-for="tab in tabs"
				:key="tab.route"
				:to="toRoute(tab.route)"
				class="w-full px-3 py-2 text-sm font-medium text-center rounded-lg transition-all duration-200"
				:class="{
					'bg-background shadow text-primary': route.name === tab.route,
					'text-muted-foreground hover:text-foreground hover:bg-secondary/80': route.name !== tab.route,
				}"
			>
				{{ tab.name }}
			</RouterLink>
		</nav>

		<slot />
	</CenterStageLayout>
</template>

<style lang="css" scoped>
.text-primary {
	color: var(--color-primary, #3b82f6);
}
</style>
