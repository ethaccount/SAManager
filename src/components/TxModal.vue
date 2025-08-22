<script setup lang="ts">
import { TransactionStatus, TxUIEmits, TxUIProps, useTxModal } from '@/stores/useTxModal'
import { VueFinalModal } from 'vue-final-modal'

withDefaults(defineProps<TxUIProps>(), {
	executions: () => [],
})

const emit = defineEmits<TxUIEmits>()

const { status } = useTxModal()

// Determine if modal can be closed
const canClose = computed(() => {
	return status.value !== TransactionStatus.Sending && status.value !== TransactionStatus.Pending
})
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
		<TxUI
			:executions="executions"
			@close="emit('close')"
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
