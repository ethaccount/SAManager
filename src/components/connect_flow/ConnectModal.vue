<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { useConnectFlow, Stage, Path, useConnectFlowStore } from '@/stores/connect_flow2'
import { SelectItem } from 'radix-vue'

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

const {
	currentStage,
	currentPath,
	reset,
	selectPath,
	navigateTo,
	updatePathData_CREATE,
	goBack,
	canGoBack,
	goNext,
	hasNextButton,
} = useConnectFlow()

onUnmounted(() => {
	reset()
})

function handle_CREATE_EOA() {
	navigateTo(Stage.CONNECT_BY_EOA)
	updatePathData_CREATE({ selectedMethod: 'EOA' })
}

function handle_CREATE_PASSKEY() {
	navigateTo(Stage.CONNECT_BY_PASSKEY)
	updatePathData_CREATE({ selectedMethod: 'PASSKEY' })
}

function handle_CREATE_EIP7702() {
	navigateTo(Stage.CONNECT_BY_EOA)
	updatePathData_CREATE({ selectedMethod: 'EIP7702' })
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
		<div v-if="currentStage === Stage.INITIAL" class="flex flex-col gap-2 w-full">
			<Button class="w-full" @click="selectPath(Path.CREATE)"> Create Smart Account </Button>
			<Button class="w-full" @click="selectPath(Path.EOA_MANAGED)"> EOA Managed </Button>
			<Button disabled class="w-full" @click="selectPath(Path.EIP7702)"> EIP-7702 </Button>
			<Button disabled class="w-full" @click="selectPath(Path.PASSKEY)"> Passkey </Button>
		</div>

		<!-- CREATE -->
		<div v-if="currentPath === Path.CREATE">
			<div v-if="currentStage === Stage.CREATE_SIGNER_CHOICE" class="flex flex-col gap-2 w-full">
				<Button class="w-full" @click="handle_CREATE_EOA"> EOA </Button>
				<Button class="w-full" @click="handle_CREATE_PASSKEY"> Passkey </Button>
				<Button class="w-full" @click="handle_CREATE_EIP7702"> EIP-7702 </Button>
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

		<div class="flex justify-between">
			<!-- back button -->
			<div v-if="canGoBack" class="flex justify-start">
				<div>
					<Button class="w-20" variant="outline" @click="goBack"> Back </Button>
				</div>
			</div>

			<!-- next button -->
			<div v-if="hasNextButton" class="flex justify-end">
				<div>
					<Button class="w-20" variant="outline" @click="goNext"> Next </Button>
				</div>
			</div>
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
