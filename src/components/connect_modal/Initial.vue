<script setup lang="ts">
import { useConnectModal, ExtendedScreenConfig, ConnectFlowState } from '@/stores/connect_modal'
const { currentScreen, checkState } = useConnectModal()

checkState(ConnectFlowState.INITIAL)

const screenConfig = currentScreen.value?.screenConfig as ExtendedScreenConfig[ConnectFlowState.INITIAL]

function handleCreate() {
	screenConfig.gotoCreate()
}

function handleEoa() {
	screenConfig.gotoEoa()
}
</script>

<template>
	<div class="flex flex-col gap-2 w-full">
		<Button class="w-full" @click="handleCreate"> Create Smart Account </Button>
		<Button class="w-full" @click="handleEoa"> EOA Managed </Button>
		<Button disabled class="w-full"> EIP-7702 </Button>
		<Button disabled class="w-full"> Passkey </Button>
	</div>
</template>

<style lang="css"></style>
