<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { ChevronLeft, X } from 'lucide-vue-next'

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

function onClickCloseSidebar() {
	emit('close')
}
</script>

<template>
	<VueFinalModal
		class="account-drawer"
		content-class="account-drawer-content"
		hide-overlay
		:content-transition="'account-drawer-slide'"
		:click-to-close="true"
		:esc-to-close="true"
		:lock-scroll="false"
	>
		<div class="account-drawer-visual-container">hello</div>
	</VueFinalModal>
</template>

<style lang="css">
.account-drawer {
	display: flex;
	justify-content: flex-end;
}

.account-drawer-content {
	@apply z-50 w-[320px] h-full p-2 pl-0;
}

.account-drawer-visual-container {
	@apply p-6 h-full border border-border bg-background shadow-xl rounded-xl;
}

.account-drawer-slide-enter-active,
.account-drawer-slide-leave-active {
	transition: transform 0.3s ease-in-out;
}

.account-drawer-slide-enter-from,
.account-drawer-slide-leave-to {
	transform: translateX(100%);
}
</style>
