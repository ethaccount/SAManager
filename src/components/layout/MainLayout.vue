<script setup lang="ts">
const route = useRoute()
</script>

<template>
	<main class="mt-14 flex-1 container px-4 py-5">
		<SendLayout v-if="route.name === 'send-token' || route.name === 'send-raw'">
			<router-view />
		</SendLayout>

		<router-view v-else />
	</main>
</template>

<style lang="css" scoped>
.container {
	@apply mx-auto w-full max-w-[1200px] px-4;
}
</style>
