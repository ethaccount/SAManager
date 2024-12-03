<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { ref } from 'vue'

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

type Stage = typeof INITIAL | EOAManaged

const INITIAL = 0

enum EOAManaged {
	CONNECT_WALLET = 1,
	ACCOUNT_CHOICE = 2,
	CREATE_ACCOUNT = 3,
}

enum Passkey {
	LOGIN_OR_SIGNUP = 1,
	SELECT_ACCOUNT = 2,
	CREATE_ACCOUNT = 3,
}

const stage = ref<Stage>(INITIAL)

function handleEOAManaged() {
	stage.value = EOAManaged.CONNECT_WALLET
}

function handlePasskey() {
	stage.value = EOAManaged.CONNECT_WALLET
}
</script>

<template>
	<VueFinalModal
		class="confirm-modal"
		content-class="confirm-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
	>
		<!-- Stage 0: INITIAL -->
		<div v-if="stage === INITIAL" class="flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<button @click="handleEOAManaged">EOA-Managed</button>
				<button @click="handlePasskey">Passkey</button>
			</div>

			<div class="flex justify-between gap-4">
				<button @click="emit('close')">Cancel</button>
			</div>
		</div>

		<!-- EOAManaged Stage 1: CONNECT_WALLET -->
		<div v-if="stage === EOAManaged.CONNECT_WALLET">
			<div>Connect Wallet</div>
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
	width: 300px;
	display: flex;
	flex-direction: column;
	padding: 1rem;
	background: #fff;
	border-radius: 0.5rem;
}
.confirm-modal-content > * + * {
	margin: 0.5rem 0;
}
.confirm-modal-content h1 {
	font-size: 1.375rem;
}
.confirm-modal-content button {
	margin: 0.25rem 0 0 auto;
	padding: 0 8px;
	border: 1px solid;
	border-radius: 0.5rem;
}
.dark .confirm-modal-content {
	background: #000;
}
</style>
