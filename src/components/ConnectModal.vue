<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { CreateAccountStage, EOAManagedStage, PasskeyStage, useConnectStage } from '../core/connect_stage'

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const { eoaManagedStage, createAccountStage, isInitialStage } = useConnectStage()
</script>

<template>
	<VueFinalModal
		class="confirm-modal"
		content-class="confirm-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
	>
		<!-- INITIAL -->
		<div v-if="isInitialStage" class="flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<button @click="eoaManagedStage = EOAManagedStage.CONNECT_EOA">Connect with EOA-Managed</button>
				<button @click="createAccountStage = CreateAccountStage.CHOOSE_ACCOUNT_TYPE_AND_VALIDATOR">
					Create Smart Account
				</button>
			</div>

			<!-- <div class="flex justify-between gap-4">
				<button @click="emit('close')">Cancel</button>
			</div> -->
		</div>

		<!-- Create Account Stage -->
		<div v-if="createAccountStage === CreateAccountStage.CHOOSE_ACCOUNT_TYPE_AND_VALIDATOR">
			<div>Choose Account Type and Validator</div>
		</div>

		<!-- EOAManaged Stage -->
		<div v-if="eoaManagedStage === EOAManagedStage.CONNECT_EOA">
			<div>Connect Wallet</div>
		</div>

		<div v-if="eoaManagedStage === EOAManagedStage.CONNECTED">
			<div>Connected</div>
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
