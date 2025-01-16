<script setup lang="ts">
import { useConnectModal, ExtendedStepMetadata, Stage } from '@/stores/connect_modal'
const { step, checkStage } = useConnectModal()

checkStage(Stage.INITIAL)

const metadata = step.value?.metadata as ExtendedStepMetadata[Stage.INITIAL]

function handleCreate() {
	metadata.gotoCreate()
}

function handleEoa() {
	metadata.gotoEoa()
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
