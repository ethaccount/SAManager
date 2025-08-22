<script setup lang="ts">
import { TransactionStatus, TxUIEmits, TxUIProps, useTxModal } from '@/stores/useTxModal'

withDefaults(defineProps<TxUIProps>(), {
	executions: () => [],
})

const emit = defineEmits<TxUIEmits>()

const { status } = useTxModal()

onMounted(() => {
	// set status to initial like useTxModalStore.openModal()
	status.value = TransactionStatus.Initial
})
</script>

<template>
	<TxUI
		:executions="executions"
		:use-modal-specific-style="false"
		@close="emit('close')"
		@executed="emit('executed')"
		@success="emit('success')"
		@failed="emit('failed')"
	/>
</template>

<style lang="css" scoped></style>
