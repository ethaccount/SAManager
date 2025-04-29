<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { ref } from 'vue'
import { useConnectSignerModal } from '@/stores/useConnectSignerModal'

// Types for account data
interface Account {
	address: string
	type: 'SA' | '7702'
}

defineProps<{
	title?: string
	currentAddress?: string
}>()

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
	(e: 'select', account: Account): void
}>()

// Mock data for accounts list
const accounts = ref<Account[]>([
	{ address: '0x1234...5678', type: 'SA' },
	{ address: '0x8765...4321', type: '7702' },
	// Add more mock accounts as needed
])

const selectedAccount = ref<Account | null>(null)

function onClickCloseSidebar() {
	emit('close')
}

function selectAccount(account: Account) {
	selectedAccount.value = account
	emit('select', account)
}

const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
</script>

<template>
	<VueFinalModal
		class="account-drawer"
		content-class="account-drawer-content"
		hide-overlay
		:content-transition="'account-drawer-slide'"
		:click-to-close="true"
		:esc-to-close="true"
		:lock-scroll="false"
	>
		<div class="account-drawer-visual-container">
			<!-- Header Section -->
			<div class="flex justify-between items-center mb-6">
				<span class="text-sm font-medium truncate">
					{{ currentAddress || '0x0000...0000' }}
				</span>
				<Button variant="ghost" size="icon" @click="onClickCloseSidebar">
					<X class="h-4 w-4" />
				</Button>
			</div>

			<!-- Account Settings Section -->
			<div class="mb-6">
				<Button variant="outline" class="w-full justify-start"> Account Settings </Button>
			</div>

			<!-- Sign-in Options Section -->
			<div class="mb-6">
				<h3 class="text-sm font-semibold uppercase tracking-wider mb-3">Keys</h3>
				<div class="space-y-2">
					<div class="flex justify-between items-center p-3 border rounded-lg">
						<span>EOA Wallet</span>
						<Button variant="outline" size="sm" @click="openConnectEOAWallet">Connect</Button>
					</div>
					<div class="flex justify-between items-center p-3 border rounded-lg">
						<span>Passkey</span>
						<Button variant="outline" size="sm" @click="openConnectPasskeyBoth">Connect</Button>
					</div>
				</div>
			</div>

			<!-- Account List Section -->
			<div>
				<h3 class="text-sm font-semibold uppercase tracking-wider mb-3">Imported Accounts</h3>
				<div class="max-h-[200px] overflow-y-auto space-y-2">
					<Button
						v-for="account in accounts"
						:key="account.address"
						variant="ghost"
						:class="[
							'w-full justify-between',
							selectedAccount?.address === account.address ? 'bg-accent font-medium' : '',
						]"
						@click="selectAccount(account)"
					>
						<span class="truncate">{{ account.address }}</span>
						<span class="text-sm text-muted-foreground">{{ account.type }}</span>
					</Button>
				</div>
			</div>
		</div>
	</VueFinalModal>
</template>

<style lang="css">
.account-drawer {
	display: flex;
	justify-content: flex-end;
}

.account-drawer-content {
	@apply z-50 w-[320px] h-full p-2 pl-0;
}

.account-drawer-visual-container {
	@apply p-4 h-full border border-border bg-background shadow-xl rounded-xl;
}

.account-drawer-slide-enter-active,
.account-drawer-slide-leave-active {
	transition: transform 0.3s ease-in-out;
}

.account-drawer-slide-enter-from,
.account-drawer-slide-leave-to {
	transform: translateX(100%);
}
</style>
