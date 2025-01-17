<script setup lang="ts">
import { useConnectModal, ConnectModalStageKey } from '@/stores/useConnectModal'

const { assertStage, goNextStage, updateStore } = useConnectModal()

assertStage(ConnectModalStageKey.INITIAL)

function onClickCreate() {
	goNextStage(ConnectModalStageKey.CREATE_SIGNER_CHOICE)
}

function onClickEOA() {
	updateStore({
		validator: 'eoa',
	})
	goNextStage(ConnectModalStageKey.EOA_EOA_CONNECT)
}
</script>

<template>
	<div class="flex flex-col gap-2 w-full">
		<Button class="w-full" @click="onClickCreate"> Create New Account </Button>
		<div class="mt-2 flex flex-col gap-2 w-full">
			<Button class="w-full" @click="onClickEOA"> EOA Managed </Button>
			<Button disabled class="w-full"> EIP-7702 </Button>
			<Button disabled class="w-full"> Passkey </Button>
		</div>
	</div>
</template>

<style lang="css"></style>
