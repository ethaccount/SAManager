<script lang="ts" setup>
import { useAccountDrawer } from '@/components/AccountDrawer/useAccountDrawer'
import ConnectModal from '@/components/connect-modal/ConnectModal.vue'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/stores/account/useAccount'
import { useConnectModal } from '@/stores/useConnectModal'
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

const { isAccountConnected, accounts } = useAccount()

function onClickAccountButton() {
	const { openAccountDrawer } = useAccountDrawer()
	openAccountDrawer()
}
</script>

<template>
	<div class="">
		<Button
			variant="outline"
			class="w-9 h-9 rounded-full"
			:class="{
				'ring-1 ring-green-500': isAccountConnected,
				'ring-1 ring-red-500': !isAccountConnected && accounts.length !== 0,
			}"
			@click="onClickAccountButton"
		>
			<Wallet class="w-4 h-4" />
		</Button>
	</div>
</template>

<style lang="css" scoped></style>
