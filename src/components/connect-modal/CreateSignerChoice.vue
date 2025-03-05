<script setup lang="ts">
import { useConnectModal, ConnectModalStageKey } from '@/stores/useConnectModal'
const { updateStore, assertStage, goNextStage } = useConnectModal()

assertStage(ConnectModalStageKey.CREATE_SIGNER_CHOICE)

function onClickEOA() {
	updateStore({
		validator: 'eoa',
	})
	goNextStage(ConnectModalStageKey.CREATE_EOA_CONNECT)
}

function onClickPasskey() {
	updateStore({
		validator: 'passkey',
	})
	goNextStage(ConnectModalStageKey.CREATE_PASSKEY_CONNECT)
}

function onClickEIP7702() {
	updateStore({
		validator: 'eip7702',
	})
	goNextStage(ConnectModalStageKey.CREATE_EIP7702_CONNECT)
}
</script>

<template>
	<Button class="w-full" @click="onClickEOA"> EOA </Button>
	<Button class="w-full" @click="onClickPasskey"> Passkey </Button>
	<Button disabled class="w-full" @click="onClickEIP7702"> EIP-7702 </Button>
</template>

<style lang="css"></style>
