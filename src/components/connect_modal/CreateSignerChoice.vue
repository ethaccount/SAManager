<script setup lang="ts">
import { useConnectModal, Stage } from '@/stores/connect_modal'
const { checkStage, goNextStep } = useConnectModal()

checkStage(Stage.CREATE_SIGNER_CHOICE)

function handleEOA() {
	goNextStep(Stage.CREATE_EOA_CONNECT)
}

function handlePasskey() {
	goNextStep(Stage.CREATE_PASSKEY_CONNECT)
}

function handleEIP7702() {
	goNextStep(Stage.CREATE_EIP7702_CONNECT)
}
</script>

<template>
	<Button class="w-full" @click="handleEOA"> EOA </Button>
	<Button disabled class="w-full" @click="handlePasskey"> Passkey </Button>
	<Button disabled class="w-full" @click="handleEIP7702"> EIP-7702 </Button>
</template>

<style lang="css"></style>
