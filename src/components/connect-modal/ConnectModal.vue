<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { useConnectModal } from '@/stores/useConnectModal'
import { ChevronLeft, X } from 'lucide-vue-next'

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const { stage, goNextStage, goBackStage, reset, canGoBack } = useConnectModal()

onUnmounted(() => {
	reset()
})

function handleNext() {
	goNextStage()
}

function handleBack() {
	goBackStage()
}

function handleClose() {
	emit('close')
}
</script>

<template>
	<VueFinalModal
		class="connect-modal"
		content-class="connect-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="true"
		:esc-to-close="true"
	>
		<div class="flex justify-between items-center">
			<!-- back button -->
			<div class="w-6">
				<Button v-if="canGoBack" class="w-6 h-6" variant="outline" size="icon" @click="handleBack">
					<ChevronLeft class="w-4 h-4" />
				</Button>
			</div>

			<div>{{ stage?.config?.title }}</div>

			<!-- close button -->
			<div class="w-6">
				<Button class="w-6 h-6" variant="outline" size="icon" @click="handleClose">
					<X class="w-4 h-4" />
				</Button>
			</div>
		</div>

		<div v-if="stage">
			<component :is="stage.component" />
		</div>
	</VueFinalModal>
</template>

<style>
.connect-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}
.connect-modal-content {
	@apply border border-border bg-background;
	width: 300px;
	min-height: 280px;
	display: flex;
	flex-direction: column;
	padding: 1rem;
	border-radius: 0.5rem;
}
.connect-modal-content > * + * {
	margin: 0.5rem 0;
}
.connect-modal-content h1 {
	font-size: 1.375rem;
}
.connect-modal-content button {
	margin: 0.25rem 0 0 auto;
	padding: 0 8px;
	border: 1px solid;
	border-radius: 0.5rem;
}
</style>
