<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { CreateAccountStage, EOAManagedStage, PasskeyStage, useConnectStage } from '../core/connect_stage'
import { Button } from '@/components/ui/button'
defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const { eoaManagedStage, createAccountStage, isInitialStage, toInitialStage } = useConnectStage()
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
				<Button class="w-full" @click="eoaManagedStage = EOAManagedStage.CONNECT_EOA">EOA-Managed</Button>
				<Button
					class="w-full"
					@click="createAccountStage = CreateAccountStage.CHOOSE_ACCOUNT_TYPE_AND_VALIDATOR"
				>
					Create Smart Account
				</Button>
			</div>

			<!-- <div class="flex justify-between gap-4">
				<button @click="emit('close')">Cancel</button>
			</div> -->
		</div>

		<!-- CreateAccountStage.CHOOSE_ACCOUNT_TYPE_AND_VALIDATOR -->
		<div
			v-if="createAccountStage === CreateAccountStage.CHOOSE_ACCOUNT_TYPE_AND_VALIDATOR"
			class="flex flex-col gap-6"
		>
			<div class="flex flex-col gap-4">
				<h3 class="text-lg font-semibold">Select Account Type</h3>
				<div class="grid grid-cols-2 gap-4">
					<button
						class="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex flex-col items-center gap-2"
					>
						<span class="text-lg font-medium">Kernel</span>
					</button>
					<button
						class="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex flex-col items-center gap-2"
					>
						<span class="text-lg font-medium">Nexus</span>
					</button>
				</div>
			</div>

			<div class="flex flex-col gap-4">
				<h3 class="text-lg font-semibold">Select Validator</h3>
				<div class="grid grid-cols-2 gap-4">
					<button
						class="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex flex-col items-center gap-2"
					>
						<span class="text-lg font-medium">ECDSA</span>
					</button>
					<button
						class="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex flex-col items-center gap-2"
					>
						<span class="text-lg font-medium">WebAuthn</span>
					</button>
				</div>
			</div>

			<div class="flex justify-end gap-4 mt-4">
				<button
					class="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
					@click="toInitialStage"
				>
					Back
				</button>
				<button
					class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
					@click="createAccountStage = CreateAccountStage.CONNECT_EOA_OR_SIGNUP_PASSKEY"
				>
					Continue
				</button>
			</div>
		</div>

		<!-- CreateAccountStage.CONNECT_EOA_OR_SIGNUP_PASSKEY -->
		<div v-if="createAccountStage === CreateAccountStage.CONNECT_EOA_OR_SIGNUP_PASSKEY">
			<div>Connect with EOA</div>
			<div>Signup with Passkey</div>
		</div>

		<!-- CreateAccountStage.CONNECTED -->
		<div v-if="createAccountStage === CreateAccountStage.CONNECTED">
			<div>Connected</div>
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
