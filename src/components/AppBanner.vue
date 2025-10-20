<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
	id: number | string
	to: string
}>()

const hidden = ref(false)

function hideBanner() {
	hidden.value = true
}
</script>

<template>
	<div
		class="fixed w-full bg-teal-300"
		:class="{
			hidden: hidden,
		}"
	>
		<div class="py-3 px-5">
			<div class="flex items-center justify-between gap-2">
				<div class="lg:flex-1 hidden lg:flex items-center" />

				<a :href="to" target="_blank" class="text-sm font-medium text-gray-900 cursor-pointer hover:underline">
					<slot />
				</a>

				<div class="flex items-center justify-end lg:flex-1">
					<Button variant="ghost" class="w-3 h-3 p-3 bg-transparent hover:bg-teal-400" @click="hideBanner">
						<X class="w-4 h-4 text-black" />
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped></style>
