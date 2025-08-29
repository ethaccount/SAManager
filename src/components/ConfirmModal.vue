<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { X } from 'lucide-vue-next'
import { VueFinalModal } from 'vue-final-modal'

withDefaults(
	defineProps<{
		title?: string
		message?: string
		htmlMessage?: boolean
		confirmText?: string
		cancelText?: string
		showCloseButton?: boolean
		clickToClose?: boolean
		escToClose?: boolean
		showDontShowAgain?: boolean
		dontShowAgainText?: string
	}>(),
	{
		title: 'Confirm',
		message: '',
		htmlMessage: false,
		confirmText: 'Confirm',
		cancelText: 'Cancel',
		showCloseButton: false,
		clickToClose: false,
		escToClose: false,
		showDontShowAgain: false,
		dontShowAgainText: "Don't show this again",
	},
)

const emit = defineEmits<{
	confirm: [dontShowAgain: boolean]
	cancel: []
	close: []
}>()

const dontShowAgain = ref(false)

function onConfirm() {
	emit('confirm', dontShowAgain.value)
}

function onCancel() {
	emit('cancel')
}

function onClose() {
	emit('close')
}
</script>

<template>
	<VueFinalModal
		class="confirm-modal"
		content-class="confirm-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="clickToClose"
		:esc-to-close="escToClose"
	>
		<!-- header -->
		<div class="flex justify-between items-center">
			<!-- left spacer -->
			<div class="w-9"></div>

			<div class="text-xl font-semibold">{{ title }}</div>

			<!-- close button -->
			<div class="w-9">
				<Button v-if="showCloseButton" variant="ghost" size="icon" @click="onClose">
					<X class="w-4 h-4" />
				</Button>
			</div>
		</div>

		<!-- message -->
		<div class="py-6">
			<div v-if="htmlMessage" v-html="message" class="text-base text-muted-foreground leading-relaxed"></div>
			<div v-else class="text-base text-muted-foreground leading-relaxed">{{ message }}</div>
		</div>

		<!-- checkbox -->
		<div v-if="showDontShowAgain" class="flex items-center space-x-2 mb-4">
			<Checkbox id="dont-show-again" v-model:checked="dontShowAgain" />
			<label for="dont-show-again" class="text-sm text-muted-foreground cursor-pointer">
				{{ dontShowAgainText }}
			</label>
		</div>

		<!-- actions -->
		<div class="flex justify-center gap-3">
			<Button v-if="cancelText" variant="outline" class="px-6" @click="onCancel">
				{{ cancelText }}
			</Button>

			<Button v-if="confirmText" variant="destructive" class="px-6" @click="onConfirm">
				{{ confirmText }}
			</Button>
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
	@apply border border-border bg-background p-6 mx-5;
	width: 420px;
	display: flex;
	flex-direction: column;
	border-radius: 0.5rem;
}
</style>
