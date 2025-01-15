<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { useConnectFlow, Stage, Path } from '@/stores/connect_flow2'

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const { currentStage, currentPath, reset, selectPath, navigateTo } = useConnectFlow()

onUnmounted(() => {
	reset()
})
</script>

<template>
	<VueFinalModal
		class="confirm-modal"
		content-class="confirm-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
	>
		<!-- Initial Stage -->
		<div v-if="currentStage === Stage.INITIAL" class="flex flex-col gap-2 w-full">
			<Button class="w-full" @click="selectPath(Path.CREATE)"> Create Smart Account </Button>
			<Button class="w-full" @click="selectPath(Path.EOA_MANAGED)"> EOA Managed </Button>
			<Button disabled class="w-full" @click="selectPath(Path.EIP7702)"> EIP-7702 </Button>
			<Button disabled class="w-full" @click="selectPath(Path.PASSKEY)"> Passkey </Button>
		</div>

		<!-- CREATE -->
		<div v-if="currentPath === Path.CREATE">
			<div v-if="currentStage === Stage.CREATE_SIGNER_CHOICE" class="flex flex-col gap-2 w-full">
				<Button class="w-full" @click="navigateTo(Stage.CONNECT_BY_EOA)"> EOA </Button>
				<Button class="w-full" @click="navigateTo(Stage.CONNECT_BY_PASSKEY)"> Passkey </Button>
			</div>

			<div v-if="currentStage === Stage.CONNECT_BY_EOA">
				<ConnectByEOA />
			</div>

			<div v-if="currentStage === Stage.CONNECT_BY_PASSKEY">
				<ConnectByPasskey />
			</div>

			<div v-if="currentStage === Stage.SETUP">
				<Setup />
			</div>
		</div>

		<!-- EOA_MANAGED -->
		<div v-if="currentPath === Path.EOA_MANAGED">
			<div v-if="currentStage === Stage.CONNECT_BY_EOA">
				<ConnectByEOA />
			</div>

			<div v-if="currentStage === Stage.SETUP">
				<Setup />
			</div>
		</div>

		<!-- Connected Stage -->
		<div v-if="currentStage === Stage.CONNECTED">
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
