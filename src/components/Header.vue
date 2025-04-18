<script lang="ts" setup>
import Address from '@/components/Address.vue'
import ConnectModal from '@/components/connect-modal/ConnectModal.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAccountDrawer } from '@/lib/useAccountDrawer'
import { useBlockchain } from '@/stores/useBlockchain'
import { useConnectModal } from '@/stores/useConnectModal'
import { useSA } from '@/stores/useSA'
import { Menu } from 'lucide-vue-next'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useModal } from 'vue-final-modal'

import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
const breakpoints = useBreakpoints(breakpointsTailwind)

const { chainId } = useBlockchain()
const { account, resetAccount, isConnected } = useSA()
const isOpen = ref(false)

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
		class="fixed top-0 left-0 right-0 z-50 h-[156px] -translate-y-[100px] flex items-end bg-background border-b px-4 lg:px-6"
	>
		<div class="h-[56px] flex w-full max-w-6xl mx-auto justify-between items-center">
			<div class="flex items-center gap-6">
				<RouterLink :to="{ name: 'home', params: { chainId } }" class="flex items-center gap-2">
					<h1 class="font-semibold text-lg" :class="{ 'text-md': breakpoints.isSmaller('sm') }">SAManager</h1>
				</RouterLink>

				<!-- Desktop Navigation -->
				<nav class="hidden sm:flex items-center space-x-6 text-sm font-medium">
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

				<!-- Mobile Navigation -->
				<Sheet>
					<SheetTrigger asChild class="sm:hidden">
						<Button variant="outline" size="icon">
							<Menu class="h-5 w-5" />
						</Button>
					</SheetTrigger>
					<SheetContent side="top" class="w-full sm:hidden">
						<SheetHeader>
							<SheetTitle>Menu</SheetTitle>
						</SheetHeader>
						<nav class="flex flex-col gap-4 mt-4">
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
					</SheetContent>
				</Sheet>
			</div>

			<div class="flex items-center sm:gap-4" :class="{ 'gap-3': breakpoints.isSmaller('sm') }">
				<NetworkSelector />
				<div v-if="isConnected" class="flex items-center space-x-4">
					<!-- <Address :address="account?.accountId || ''" class="hidden sm:block" />
					<Button variant="outline" size="sm" @click="onClickDisconnect">Disconnect</Button> -->
					<Button
						variant="outline"
						:size="breakpoints.isSmaller('sm') ? 'sm' : 'lg'"
						@click="onClickAccountButton"
						class="sm:w-auto sm:px-4 w-12 h-12 p-0 rounded-full sm:rounded-md"
						>0x13</Button
					>
				</div>
				<Button
					v-else
					variant="outline"
					:size="breakpoints.isSmaller('sm') ? 'sm' : 'lg'"
					@click="onClickConnectButton"
					>Add Account</Button
				>
			</div>
		</div>
	</header>
</template>

<style lang="css" scoped></style>
