<script setup lang="ts">
import { TransactionStatus, useTxModal } from '@/stores/useTxModal'

const { status } = useTxModal()

onMounted(() => {
	// set status to initial like useTxModalStore.openModal()
	status.value = TransactionStatus.Initial
})
</script>

<template>
	<TxUI :use-modal-specific-style="false" v-bind="$attrs" v-on="$attrs" />
</template>

<style lang="css" scoped></style>
