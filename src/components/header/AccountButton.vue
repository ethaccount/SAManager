<script lang="ts" setup>
import { useAccountDrawer } from '@/components/AccountDrawer/useAccountDrawer'
import ConnectModal from '@/components/connect-modal/ConnectModal.vue'
import { Button } from '@/components/ui/button'
import { useConnectModal } from '@/stores/useConnectModal'
import { useValidation } from '@/stores/validation/useValidation'
import { Wallet } from 'lucide-vue-next'
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

const { isAccountConnected } = useValidation()

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
				:class="['ring-1', isAccountConnected ? 'ring-green-500' : 'ring-red-500']"
			></div>
			<Wallet class="relative w-5 h-5" />
		</Button>
	</div>
</template>

<style lang="css" scoped></style>
