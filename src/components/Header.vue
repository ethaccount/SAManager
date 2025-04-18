<script lang="ts" setup>
import Address from '@/components/Address.vue'
import ConnectModal from '@/components/connect-modal/ConnectModal.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { Button } from '@/components/ui/button'
import { useAccountDrawer } from '@/lib/useAccountDrawer'
import { useBlockchain } from '@/stores/useBlockchain'
import { useConnectModal } from '@/stores/useConnectModal'
import { useSA } from '@/stores/useSA'
import { useModal } from 'vue-final-modal'
import { RouterLink } from 'vue-router'

const { chainId } = useBlockchain()

const { account, resetAccount, isConnected } = useSA()

function onClickDisconnect() {
	resetAccount()
}

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

function onClickConnectButton() {
	openConnectModal()
	connectModalStore.goNextStage()
}

function onClickAccountButton() {
	const { openAccountDrawer } = useAccountDrawer()
	openAccountDrawer()
}
</script>

<template>
	<header
		class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
	>
		<div class="container flex h-14 items-center">
			<RouterLink :to="{ name: 'home', params: { chainId } }" class="mr-6 flex items-center space-x-2">
				<span class="font-bold">SAManager</span>
			</RouterLink>

			<nav class="flex items-center space-x-6 text-sm font-medium flex-1">
				<RouterLink
					:to="{ name: 'send-token', params: { chainId } }"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
				>
					Send
				</RouterLink>
				<RouterLink
					:to="{ name: 'scheduling-transfer', params: { chainId } }"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
				>
					Scheduling
				</RouterLink>
				<RouterLink
					:to="{ name: 'recovery-setup', params: { chainId } }"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
				>
					Recovery
				</RouterLink>
			</nav>

			<div class="flex items-center justify-end space-x-4">
				<NetworkSelector />
				<ThemeToggle />
				<div v-if="isConnected" class="flex items-center space-x-4">
					<Address :address="account?.accountId || ''" />
					<Button variant="outline" size="sm" @click="onClickDisconnect">Disconnect</Button>
				</div>
				<Button v-else variant="outline" size="sm" @click="onClickConnectButton">Add Account</Button>
				<Button variant="outline" size="lg" @click="onClickAccountButton">0x1234...5678</Button>
			</div>
		</div>
	</header>
</template>

<style lang="css" scoped></style>
