<script setup lang="ts">
import { ExecutionUIEmits, ExecutionUIProps, useExecutionModal } from '@/components/execution'
import { VueFinalModal } from 'vue-final-modal'

withDefaults(defineProps<ExecutionUIProps>(), {
	executions: () => [],
})

const emit = defineEmits<ExecutionUIEmits>()

const { canClose } = useExecutionModal()

const isCloseHandled = ref(false)

onUnmounted(() => {
	handleClose()
})

function handleClose() {
	if (isCloseHandled.value) return
	emit('close')
	isCloseHandled.value = true
}
</script>

<template>
	<VueFinalModal
		class="transaction-modal"
		content-class="transaction-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="canClose"
		:esc-to-close="canClose"
	>
		<ExecutionUI
			:executions="executions"
			@close="handleClose"
			@executed="emit('executed')"
			@success="emit('success')"
			@failed="emit('failed')"
		/>
	</VueFinalModal>
</template>

<style lang="css">
.transaction-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}

.transaction-modal-content {
	@apply border border-border bg-background;
	width: 420px;
	min-height: 390px;
	max-height: 95vh;
	display: flex;
	flex-direction: column;
	border-radius: 0.5rem;
	overflow: hidden;
}

/* Is the following needed? */

:deep(.select-content) {
	@apply w-[var(--radix-select-trigger-width)];
}

@keyframes scale {
	0% {
		transform: scale(0.8);
		opacity: 0;
	}
	100% {
		transform: scale(1);
		opacity: 1;
	}
}

@keyframes dash {
	to {
		stroke-dashoffset: 0;
	}
}
</style>
