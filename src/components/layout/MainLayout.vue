<script setup lang="ts">
const route = useRoute()
</script>

<template>
	<main v-if="route.name === 'browser'" class="mt-14 h-[calc(100vh-3.5rem)]">
		<router-view />
	</main>

	<main v-else class="mt-14 flex-1 mx-auto w-full max-w-[1200px] px-4 py-5">
		<SendLayout v-if="route.name === 'send-token' || route.name === 'send-raw'">
			<router-view />
		</SendLayout>

		<ScheduleLayout
			v-else-if="
				route.name === 'scheduling-transfer' ||
				route.name === 'scheduling-swap' ||
				route.name === 'scheduling-jobs'
			"
		>
			<router-view />
		</ScheduleLayout>

		<router-view v-else />
	</main>
</template>

<style lang="css"></style>
