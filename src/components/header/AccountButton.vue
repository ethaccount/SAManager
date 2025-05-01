<script lang="ts" setup>
import ConnectModal from '@/components/connect-modal/ConnectModal.vue'
import { Button } from '@/components/ui/button'
import { useAccountDrawer } from '@/lib/useAccountDrawer'
import { useConnectModal } from '@/stores/useConnectModal'
import { useAccounts } from '@/stores/useAccounts'
import { useModal } from 'vue-final-modal'
import { Wallet } from 'lucide-vue-next'

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
		<Button variant="outline" class="w-9 h-9 rounded-full relative" @click="onClickAccountButton">
			<div
				class="absolute inset-0 rounded-full"
				:class="['ring-1', isConnected ? 'ring-green-500' : 'ring-red-500']"
			></div>
			<Wallet class="relative w-5 h-5" />
		</Button>
	</div>
</template>

<style lang="css" scoped></style>
