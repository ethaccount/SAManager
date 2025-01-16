<script setup lang="ts">
import { useConnectModal, ConnectFlowState } from '@/stores/connect_modal'
const { updateStore, assertState, goNextState } = useConnectModal()

assertState(ConnectFlowState.CREATE_SIGNER_CHOICE)

function onClickEOA() {
	updateStore({
		validator: 'eoa',
	})
	goNextState(ConnectFlowState.CREATE_EOA_CONNECT)
}

function onClickPasskey() {
	updateStore({
		validator: 'passkey',
	})
	goNextState(ConnectFlowState.CREATE_PASSKEY_CONNECT)
}

function onClickEIP7702() {
	updateStore({
		validator: 'eip7702',
	})
	goNextState(ConnectFlowState.CREATE_EIP7702_CONNECT)
}
</script>

<template>
	<Button class="w-full" @click="onClickEOA"> EOA </Button>
	<Button disabled class="w-full" @click="onClickPasskey"> Passkey </Button>
	<Button disabled class="w-full" @click="onClickEIP7702"> EIP-7702 </Button>
</template>

<style lang="css"></style>
