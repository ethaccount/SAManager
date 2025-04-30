<script lang="ts" setup>
import ConnectModal from '@/components/connect-modal/ConnectModal.vue'
import { useAccountDrawer } from '@/lib/useAccountDrawer'
import { useNetwork } from '@/stores/useNetwork'
import { useConnectModal } from '@/stores/useConnectModal'
import { useAccounts } from '@/stores/useAccounts'
import { useSA } from '@/stores/useSA'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useModal } from 'vue-final-modal'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
const breakpoints = useBreakpoints(breakpointsTailwind)

const { selectedChainId } = useNetwork()
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

const { hasAccounts } = useAccounts()
</script>

<template>
	<header
		class="fixed top-0 left-0 right-0 z-50 h-[156px] -translate-y-[100px] flex items-end bg-background border-b px-4 lg:px-6"
	>
		<div class="h-[56px] flex w-full max-w-6xl mx-auto justify-between items-center">
			<div class="flex items-center gap-2 sm:gap-6">
				<!-- SAManager -->
				<RouterLink
					:to="{ name: 'home', params: { chainId: selectedChainId } }"
					class="flex items-center gap-2"
				>
					<h1 class="font-semibold text-lg" :class="{ 'text-md': breakpoints.isSmaller('sm') }">SAManager</h1>
				</RouterLink>

				<Navigator />
			</div>

			<div class="flex items-center gap-2 sm:gap-4" :class="{ 'gap-3': breakpoints.isSmaller('sm') }">
				<NetworkSelector />
				<AccountButton v-if="hasAccounts" />
			</div>
		</div>
	</header>
</template>

<style lang="css" scoped></style>
