<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { EOAManagedStage, PasskeyStage, useConnectStage } from '../core/connect_stage'

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const { eoaManagedStage, passkeyStage } = useConnectStage()
</script>

<template>
	<VueFinalModal
		class="confirm-modal"
		content-class="confirm-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
	>
		<!-- INITIAL -->
		<div
			v-if="eoaManagedStage === EOAManagedStage.INITIAL && passkeyStage === PasskeyStage.INITIAL"
			class="flex flex-col gap-4"
		>
			<div class="flex flex-col gap-2">
				<button @click="eoaManagedStage = EOAManagedStage.CONNECT_WALLET">EOA-Managed</button>
				<button @click="passkeyStage = PasskeyStage.LOGIN_OR_SIGNUP">Passkey</button>
			</div>

			<div class="flex justify-between gap-4">
				<button @click="emit('close')">Cancel</button>
			</div>
		</div>

		<!-- EOAManaged Stage -->
		<div v-if="eoaManagedStage === EOAManagedStage.CONNECT_WALLET">
			<div>Connect Wallet</div>
		</div>

		<div v-if="eoaManagedStage === EOAManagedStage.ACCOUNT_CHOICE">
			<div>Account Choice</div>
		</div>

		<div v-if="eoaManagedStage === EOAManagedStage.CREATE_ACCOUNT">
			<div>Create Account</div>
		</div>

		<div v-if="eoaManagedStage === EOAManagedStage.CONNECTED">
			<div>Connected</div>
		</div>

		<!-- Passkey Stage -->
		<div v-if="passkeyStage === PasskeyStage.LOGIN_OR_SIGNUP">
			<div>Login or Signup</div>
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
