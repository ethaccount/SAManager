<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { useConnectModal } from '@/stores/connect_modal'

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const { step, goNextStep, goBackStep, reset, canGoBack, canGoNext } = useConnectModal()

onUnmounted(() => {
	reset()
})
</script>

<template>
	<VueFinalModal
		class="confirm-modal"
		content-class="confirm-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
	>
		<div v-if="step">
			<component :is="step.component" />
		</div>

		<div class="flex justify-between">
			<!-- back button -->
			<div class="flex justify-start">
				<div v-if="canGoBack">
					<Button class="w-20" variant="outline" @click="goBackStep"> Back </Button>
				</div>
			</div>

			<!-- next button -->
			<div class="flex justify-end">
				<div v-if="canGoNext">
					<Button class="w-20" variant="outline" @click="goNextStep"> Next </Button>
				</div>
			</div>
		</div>
	</VueFinalModal>
</template>

<style>
.confirm-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}
.confirm-modal-content {
	width: 300px;
	display: flex;
	flex-direction: column;
	padding: 1rem;
	background: #fff;
	border-radius: 0.5rem;
}
.confirm-modal-content > * + * {
	margin: 0.5rem 0;
}
.confirm-modal-content h1 {
	font-size: 1.375rem;
}
.confirm-modal-content button {
	margin: 0.25rem 0 0 auto;
	padding: 0 8px;
	border: 1px solid;
	border-radius: 0.5rem;
}
.dark .confirm-modal-content {
	background: #000;
}
</style>
