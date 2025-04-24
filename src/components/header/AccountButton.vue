<script lang="ts" setup>
import ConnectModal from '@/components/connect-modal/ConnectModal.vue'
import { Button } from '@/components/ui/button'
import { useAccountDrawer } from '@/lib/useAccountDrawer'
import { useConnectModal } from '@/stores/useConnectModal'
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

function onClickAccountButton() {
	const { openAccountDrawer } = useAccountDrawer()
	openAccountDrawer()
}
</script>

<template>
	<div class="">
		<Button variant="outline" class="w-10 h-10 rounded-full" @click="onClickAccountButton"> A</Button>
	</div>
</template>

<style lang="css" scoped></style>
