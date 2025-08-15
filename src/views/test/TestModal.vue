<script setup lang="ts">
import { useConfirmModal } from '@/components/ConfirmModal/useConfirmModal'

function onClickOpen() {
	const { openModal } = useConfirmModal()
	openModal({
		title: 'Delete Account',
		message: 'Are you sure you want to delete this account? This action cannot be undone.',
		confirmText: 'Delete',
		cancelText: 'Cancel',
		showCloseButton: true,
		onConfirm: (dontShowAgain?: boolean) => {
			console.log('onConfirm', dontShowAgain)
		},
		onCancel: () => {
			console.log('onCancel')
		},
		onClose: () => {
			console.log('onClose')
		},
	})
}
</script>

<template>
	<div>
		<div>Hello</div>
		<div>
			<Button variant="outline" @click="onClickOpen()"> Open </Button>
		</div>
	</div>
</template>

<style lang="css" scoped></style>
