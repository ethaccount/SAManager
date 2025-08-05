<script setup lang="ts">
import { useImportAccountModal } from '@/stores/useImportAccountModal'
import { ChevronLeft, X } from 'lucide-vue-next'
import { VueFinalModal } from 'vue-final-modal'

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const { stage, canGoBack, goBackStage, reset } = useImportAccountModal()

onUnmounted(() => {
	reset()
})

function onClickGoBack() {
	goBackStage()
}

function onClickClose() {
	emit('close')
}
</script>

<template>
	<VueFinalModal
		class="import-account-modal"
		content-class="import-account-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="true"
		:esc-to-close="true"
	>
		<div class="flex justify-between items-center">
			<!-- go back button -->
			<div class="w-9">
				<Button v-if="canGoBack" variant="ghost" size="icon" @click="onClickGoBack">
					<ChevronLeft class="w-4 h-4" />
				</Button>
			</div>

			<div>{{ stage.title }}</div>

			<!-- close button -->
			<Button variant="ghost" size="icon" @click="onClickClose">
				<X class="w-4 h-4" />
			</Button>
		</div>

		<div class="mt-4">
			<component :is="stage.component" v-bind="stage.attrs ?? {}" />
		</div>
	</VueFinalModal>
</template>

<style>
.import-account-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}

.import-account-modal-content {
	@apply border border-border bg-background p-6 mx-2;
	width: 420px;
	min-height: 390px;
	display: flex;
	flex-direction: column;
	border-radius: 0.5rem;
}
</style>
