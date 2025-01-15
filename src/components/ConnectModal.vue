<script setup lang="ts">
import { shortenAddress, useVueDapp } from '@vue-dapp/core'
import { useVueDappModal } from '@vue-dapp/modal'
import { VueFinalModal } from 'vue-final-modal'
import { CreateAccountStage, EOAManagedStage, useConnectStage } from '../core/connect_stage'

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const { eoaManagedStage, createAccountStage, isInitialStage, toInitialStage } = useConnectStage()
const { isConnected, wallet, disconnect } = useVueDapp()

function onClickConnectButton() {
	emit('close')
	if (isConnected.value) disconnect()
	else useVueDappModal().open()
}

const deployedAddress = ref('')

watch(createAccountStage, () => {
	if (createAccountStage.value === CreateAccountStage.CONNECT_EOA_OR_SIGNUP_PASSKEY) {
		if (isConnected.value) {
			deployedAddress.value = getDeployedAddress()
		}
	}
})

function getDeployedAddress() {
	return '0x1234567890'
}

function onClickDeploy() {
	createAccountStage.value = CreateAccountStage.CONNECTED
}
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

				<RadioGroup default-value="kernel" class="grid grid-cols-2 gap-4">
					<div>
						<RadioGroupItem id="kernel" value="kernel" class="peer sr-only" />
						<Label
							for="kernel"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
						>
							Kernel
						</Label>
					</div>
					<div>
						<RadioGroupItem id="myaccount" value="myaccount" class="peer sr-only" />
						<Label
							for="myaccount"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
						>
							MyAccount
						</Label>
					</div>
				</RadioGroup>
			</div>

			<div class="flex flex-col gap-4">
				<h3 class="text-lg font-semibold">Select Validator</h3>

				<RadioGroup default-value="ecdsa" class="grid grid-cols-2 gap-4">
					<div>
						<RadioGroupItem id="ecdsa" value="ecdsa" class="peer sr-only" />
						<Label
							for="ecdsa"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
						>
							ECDSA
						</Label>
					</div>
					<div>
						<RadioGroupItem id="webauthn" value="webauthn" class="peer sr-only" />
						<Label
							for="webauthn"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
						>
							Passkey
						</Label>
					</div>
				</RadioGroup>
			</div>

			<div class="flex w-full gap-4 mt-4">
				<Button class="w-full" variant="outline" @click="toInitialStage">Back</Button>
				<Button class="w-full" @click="createAccountStage = CreateAccountStage.CONNECT_EOA_OR_SIGNUP_PASSKEY">
					Continue
				</Button>
			</div>
		</div>

		<!-- CreateAccountStage.CONNECT_EOA_OR_SIGNUP_PASSKEY -->
		<div v-if="createAccountStage === CreateAccountStage.CONNECT_EOA_OR_SIGNUP_PASSKEY">
			<div>Connect with EOA</div>
			<div>{{ wallet.address ? shortenAddress(wallet.address) : 'Not connected' }}</div>
			<button v-if="!isConnected" @click="onClickConnectButton">Connect</button>

			<div>Deployed Address</div>
			<div>{{ deployedAddress }}</div>

			<div>
				<Button class="w-full" @click="onClickDeploy">Deploy</Button>
			</div>
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
