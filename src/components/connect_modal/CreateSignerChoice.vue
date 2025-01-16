<script setup lang="ts">
import { useConnectModal, ConnectFlowState } from '@/stores/connect_modal'
const { checkState, goNextState } = useConnectModal()

checkState(ConnectFlowState.CREATE_SIGNER_CHOICE)

function handleEOA() {
	goNextState(ConnectFlowState.CREATE_EOA_CONNECT)
}

function handlePasskey() {
	goNextState(ConnectFlowState.CREATE_PASSKEY_CONNECT)
}

function handleEIP7702() {
	goNextState(ConnectFlowState.CREATE_EIP7702_CONNECT)
}
</script>

<template>
	<Button class="w-full" @click="handleEOA"> EOA </Button>
	<Button disabled class="w-full" @click="handlePasskey"> Passkey </Button>
	<Button disabled class="w-full" @click="handleEIP7702"> EIP-7702 </Button>
</template>

<style lang="css"></style>
