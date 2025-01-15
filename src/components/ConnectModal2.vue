<script setup lang="ts">
import { shortenAddress, useVueDapp } from '@vue-dapp/core'
import { VueFinalModal } from 'vue-final-modal'
import { useConnectFlowStore, ConnectStage } from '@/stores/connect_flow'

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const { moveToConnected, reset, selectPath } = useConnectFlowStore()
const { currentStage, selectedPath } = storeToRefs(useConnectFlowStore())

async function onWalletConnected() {
	if (selectedPath.value === ConnectStage.CREATE) {
		// Handle create path specific logic
		await handleCreateAccount()
	} else if (selectedPath.value === ConnectStage.EOA_MANAGED) {
		// Handle EOA managed path specific logic
		await handleEOAConnection()
	}
}

async function handleCreateAccount() {
	console.log('handleCreateAccount')
}

async function handleEOAConnection() {
	console.log('handleEOAConnection')
}
</script>

<template>
	<VueFinalModal
		class="confirm-modal"
		content-class="confirm-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
	>
		<!-- Initial Stage -->
		<div v-if="currentStage === ConnectStage.INITIAL" class="flex flex-col gap-2 w-full">
			<Button class="w-full" @click="selectPath(ConnectStage.CREATE)"> Create Smart Account </Button>
			<Button class="w-full" @click="selectPath(ConnectStage.EOA_MANAGED)"> EOA Managed </Button>
			<Button disabled class="w-full" @click="selectPath(ConnectStage.EIP7702)"> EIP-7702 </Button>
			<Button disabled class="w-full" @click="selectPath(ConnectStage.PASSKEY)"> Passkey </Button>
		</div>

		<!-- Connect Wallet Stage -->
		<div v-if="currentStage === ConnectStage.CONNECT_WALLET">
			<ConnectWalletStage @connected="onWalletConnected" />
		</div>

		<!-- Passkey Login Stage -->
		<div v-if="currentStage === ConnectStage.PASSKEY_LOGIN">
			<!-- Passkey login UI -->
			<Button @click="moveToConnected"> Login with Passkey </Button>
		</div>

		<!-- Connected Stage -->
		<div v-if="currentStage === ConnectStage.CONNECTED">
			<div>Successfully Connected!</div>
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
