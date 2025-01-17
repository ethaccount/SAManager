<script setup lang="ts">
import { useConnectModal, ExtendedScreenConfig, ConnectModalStageKey } from '@/stores/connect_modal'
const { stage, assertStage } = useConnectModal()

assertStage(ConnectModalStageKey.INITIAL)

const config = stage.value?.config as ExtendedScreenConfig[ConnectModalStageKey.INITIAL]

function handleCreate() {
	config.gotoCreate()
}

function handleEoa() {
	config.gotoEoa()
}
</script>

<template>
	<div class="flex flex-col gap-2 w-full">
		<Button class="w-full" @click="handleCreate"> Create New Account </Button>
		<div class="mt-2 flex flex-col gap-2 w-full">
			<Button class="w-full" @click="handleEoa"> EOA Managed </Button>
			<Button disabled class="w-full"> EIP-7702 </Button>
			<Button disabled class="w-full"> Passkey </Button>
		</div>
	</div>
</template>

<style lang="css"></style>
