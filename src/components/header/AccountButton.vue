<script lang="ts" setup>
import ConnectModal from '@/components/connect-modal/ConnectModal.vue'
import { Button } from '@/components/ui/button'
import { useAccountDrawer } from '@/lib/useAccountDrawer'
import { useConnectModal } from '@/stores/useConnectModal'
import { useAccounts } from '@/stores/useAccounts'
import { useModal } from 'vue-final-modal'

// ============================== Connect Modal ==============================
const connectModalStore = useConnectModal()
const { open: openConnectModal, close: closeConnectModal } = useModal({
	component: ConnectModal,
	attrs: {
		onClose: () => closeConnectModal(),
	},
	slots: {},
})

connectModalStore.updateStore({
	openModal: openConnectModal,
	closeModal: closeConnectModal,
})

const { isConnected } = useAccounts()

function onClickAccountButton() {
	const { openAccountDrawer } = useAccountDrawer()
	openAccountDrawer()
}
</script>

<template>
	<div class="">
		<Button variant="outline" class="w-10 h-10 rounded-full relative" @click="onClickAccountButton">
			<div
				class="absolute inset-0 rounded-full"
				:class="['ring-1', isConnected ? 'ring-green-500' : 'ring-red-500']"
			></div>
			<span class="relative">A</span>
		</Button>
	</div>
</template>

<style lang="css" scoped></style>
