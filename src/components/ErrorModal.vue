<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { VueFinalModal } from 'vue-final-modal'

const props = defineProps<{
	message: string
}>()

const emit = defineEmits<{
	close: []
}>()

function onClickClose() {
	emit('close')
}
</script>

<template>
	<VueFinalModal
		class="error-modal"
		content-class="error-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="true"
		:esc-to-close="true"
	>
		<div class="flex justify-between items-center">
			<!-- back button -->
			<div class="w-6"></div>

			<div>Error</div>

			<!-- close button -->
			<div class="w-6">
				<Button class="w-6 h-6" variant="outline" size="icon" @click="onClickClose">
					<X class="w-4 h-4" />
				</Button>
			</div>
		</div>

		<div>
			<div>{{ message }}</div>
		</div>
	</VueFinalModal>
</template>

<style lang="css">
.error-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}
.error-modal-content {
	width: 300px;
	display: flex;
	flex-direction: column;
	padding: 1rem;
	background: #fff;
	border-radius: 0.5rem;
}
.error-modal-content > * + * {
	margin: 0.5rem 0;
}
.error-modal-content h1 {
	font-size: 1.375rem;
}
.error-modal-content button {
	margin: 0.25rem 0 0 auto;
	padding: 0 8px;
	border: 1px solid;
	border-radius: 0.5rem;
}
.dark .error-modal-content {
	background: #000;
}
</style>
