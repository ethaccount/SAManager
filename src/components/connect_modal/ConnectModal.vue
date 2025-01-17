<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { useConnectModal } from '@/stores/connect_modal'
import { ChevronLeft, X } from 'lucide-vue-next'
defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const { currentScreen, goNextState, goBackState, reset, canGoBack, hasNextButton } = useConnectModal()

onUnmounted(() => {
	reset()
})

function handleNext() {
	goNextState()
}

function handleBack() {
	goBackState()
}

function handleClose() {
	emit('close')
}
</script>

<template>
	<VueFinalModal
		class="confirm-modal"
		content-class="confirm-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="false"
		:esc-to-close="false"
	>
		<div class="flex justify-between items-center">
			<!-- back button -->
			<div class="w-6">
				<Button v-if="canGoBack" class="w-6 h-6" variant="outline" size="icon" @click="handleBack">
					<ChevronLeft class="w-4 h-4" />
				</Button>
			</div>

			<div>{{ currentScreen?.config?.title }}</div>

			<!-- close button -->
			<div class="w-6">
				<Button class="w-6 h-6" variant="outline" size="icon" @click="handleClose">
					<X class="w-4 h-4" />
				</Button>
			</div>
		</div>

		<div v-if="currentScreen">
			<component :is="currentScreen.component" />
		</div>

		<div v-if="hasNextButton" class="flex flex-col">
			<Button class="w-full" variant="outline" @click="handleNext"> Next </Button>
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
