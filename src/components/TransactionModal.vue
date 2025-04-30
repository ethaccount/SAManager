<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { VueFinalModal } from 'vue-final-modal'

const emit = defineEmits<{
	(e: 'close'): void
}>()

function onClickClose() {
	emit('close')
}
</script>

<template>
	<VueFinalModal
		class="transaction-modal"
		content-class="transaction-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="true"
		:esc-to-close="true"
	>
		<div class="flex justify-between items-center">
			<!-- go back button -->
			<div class="w-9"></div>

			<div>Sending Transaction</div>

			<!-- close button -->
			<Button variant="ghost" size="icon" @click="onClickClose">
				<X class="w-4 h-4" />
			</Button>
		</div>

		<div class="mt-4">Hello</div>
	</VueFinalModal>
</template>

<style>
.transaction-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}
.transaction-modal-content {
	@apply border border-border bg-background p-6 mx-2;
	width: 420px;
	min-height: 390px;
	display: flex;
	flex-direction: column;
	border-radius: 0.5rem;
}
</style>
