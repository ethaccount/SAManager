<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { VueFinalModal } from 'vue-final-modal'
import { Button } from '@/components/ui/button'

const props = defineProps<{
	title?: string
	message: string
	confirmText?: string
	cancelText?: string
}>()

const emit = defineEmits<{
	confirm: []
	cancel: []
}>()

function onConfirm() {
	emit('confirm')
}

function onCancel() {
	emit('cancel')
}
</script>

<template>
	<VueFinalModal
		class="confirm-modal"
		content-class="confirm-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="true"
		:esc-to-close="true"
	>
		<div class="flex justify-between items-center">
			<div class="w-6"></div>
			<div class="text-xl font-semibold">{{ title || 'Confirm' }}</div>
			<div class="w-6">
				<Button class="w-7 h-7 hover:bg-destructive/10" variant="ghost" size="icon" @click="onCancel">
					<X class="w-4 h-4" />
				</Button>
			</div>
		</div>

		<div class="py-6">
			<div class="text-base text-muted-foreground leading-relaxed">{{ message }}</div>
		</div>

		<div class="flex justify-end gap-3">
			<Button variant="outline" class="px-6" @click="onCancel">
				{{ cancelText || 'Cancel' }}
			</Button>
			<Button variant="destructive" class="px-6" @click="onConfirm">
				{{ confirmText || 'Confirm' }}
			</Button>
		</div>
	</VueFinalModal>
</template>

<style lang="css">
.confirm-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}

.confirm-modal-content {
	width: 460px;
	display: flex;
	flex-direction: column;
	padding: 1.5rem;
	background: #fff;
	border-radius: 0.75rem;
	box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
	border: 1px solid rgb(0 0 0 / 0.1);
}

.dark .confirm-modal-content {
	background: hsl(var(--background));
	border-color: hsl(var(--border));
}

.vfm-fade-enter-active,
.vfm-fade-leave-active {
	transition: opacity 0.2s;
}

.vfm-fade-enter-from,
.vfm-fade-leave-to {
	opacity: 0;
}
</style>
