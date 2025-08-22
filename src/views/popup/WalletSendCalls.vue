<script setup lang="ts">
import { TxUIEmits, TxUIProps } from '@/stores/useTxModal'

withDefaults(defineProps<TxUIProps>(), {
	executions: () => [],
})

const emit = defineEmits<TxUIEmits>()
</script>

<template>
	<TxUI
		:executions="executions"
		@close="emit('close')"
		@executed="emit('executed')"
		@success="emit('success')"
		@failed="emit('failed')"
	/>
</template>

<style lang="css" scoped></style>
