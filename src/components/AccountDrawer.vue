<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { displayAccountName, ImportedAccount } from '@/lib/account'
import { displayChainName } from '@/lib/network'
import { toRoute } from '@/lib/router'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { useAccounts } from '@/stores/useAccounts'
import { useRouter } from 'vue-router'
import { shortenAddress } from '@vue-dapp/core'
import { Power, X, CircleDot } from 'lucide-vue-next'
import { VueFinalModal } from 'vue-final-modal'
import { useEOAWallet } from '@/stores/useEOAWallet'

const emit = defineEmits<{
	(e: 'close'): void
}>()

function onClickCloseSidebar() {
	emit('close')
}

const { accounts, selectedAccount, isConnected } = useAccounts()
const { wallet, address, isEOAWalletConnected, disconnect } = useEOAWallet()
const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()

function onClickSelectAccount(account: ImportedAccount) {
	selectedAccount.value = account
}

function onClickRemoveAccount(account: ImportedAccount) {
	useAccounts().removeAccount(account)
}

const router = useRouter()

function onClickAccountSettings() {
	if (!selectedAccount.value) return
	router.push(toRoute('account-settings', { address: selectedAccount.value.address }))
	emit('close')
}
</script>

<template>
	<VueFinalModal
		class="account-drawer"
		content-class="account-drawer-content"
		hide-overlay
		background="interactive"
		:content-transition="'account-drawer-slide'"
		:click-to-close="true"
		:esc-to-close="true"
		:lock-scroll="false"
	>
		<div class="account-drawer-visual-container">
			<!-- Header Section -->
			<div class="flex justify-between items-start mb-6">
				<div class="w-full flex justify-between items-start gap-2">
					<div v-if="selectedAccount" class="p-1.5">
						<div class="flex justify-between items-center mb-1">
							<div class="flex items-center gap-2">
								<CircleDot class="w-3 h-3" :class="isConnected ? 'text-green-500' : 'text-red-500'" />
								<span class="font-medium truncate">{{ shortenAddress(selectedAccount.address) }}</span>
							</div>
						</div>
						<div class="flex flex-col text-xs text-muted-foreground">
							<div class="flex gap-2">
								<span>{{ displayAccountName(selectedAccount.accountId) }}</span>
								<span>{{ displayChainName(selectedAccount.chainId) }}</span>
							</div>

							<div v-for="vOption in selectedAccount.vOptions" :key="vOption.type" class="mt-1">
								<span>{{ vOption.type }}: {{ shortenAddress(vOption.publicKey) }}</span>
							</div>
						</div>
					</div>
					<Button variant="ghost" size="icon" @click="onClickCloseSidebar">
						<X class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<!-- Account Settings Section -->
			<div class="mb-6">
				<Button
					:disabled="!selectedAccount"
					variant="outline"
					class="w-full justify-start"
					@click="onClickAccountSettings"
				>
					Account Settings
				</Button>
			</div>

			<!-- Sign-in Options Section -->
			<div class="mb-6">
				<h3 class="text-sm font-semibold tracking-wider mb-3">Signers</h3>
				<div class="space-y-2">
					<div class="flex flex-col p-3 border rounded-lg" :class="{ 'bg-secondary': isEOAWalletConnected }">
						<div v-if="!isEOAWalletConnected" class="flex justify-between items-center">
							<span>EOA Wallet</span>
							<Button variant="outline" size="sm" @click="openConnectEOAWallet"> Connect </Button>
						</div>
						<div v-if="isEOAWalletConnected" class="">
							<div class="flex justify-between items-center gap-2 text-sm text-muted-foreground">
								<div>{{ wallet.providerInfo?.name }} Connected</div>
								<Button variant="ghost" size="icon" @click="disconnect">
									<Power class="w-4 h-4" />
								</Button>
							</div>
							<div class="text-xs">
								{{ shortenAddress(address || '') }}
							</div>
						</div>
					</div>
					<div class="flex justify-between items-center p-3 border rounded-lg">
						<span>Passkey</span>
						<Button variant="outline" size="sm" @click="openConnectPasskeyBoth">Connect</Button>
					</div>
				</div>
			</div>

			<!-- Account List -->
			<div class="h-[calc(100%-200px)]">
				<h3 class="text-sm font-semibold tracking-wider mb-3">Accounts</h3>
				<div class="h-full overflow-y-auto space-y-2 pr-3 pt-2">
					<div
						v-for="account in accounts"
						:key="account.address"
						class="relative group p-3 rounded-lg border transition-colors hover:bg-accent cursor-pointer overflow-visible"
						:class="{
							'bg-accent':
								account.address === selectedAccount?.address &&
								account.chainId === selectedAccount?.chainId,
						}"
						@click="onClickSelectAccount(account)"
					>
						<div>
							<div class="flex justify-between items-center mb-1">
								<span class="font-medium truncate">{{ shortenAddress(account.address) }}</span>
								<span class="text-xs text-muted-foreground">
									{{ displayChainName(account.chainId) }}
								</span>
								<!-- <span class="text-xs text-muted-foreground">{{ account.type }}</span> -->
							</div>
							<div class="flex justify-between items-center text-xs text-muted-foreground">
								<span>{{ displayAccountName(account.accountId) }}</span>
								<!-- <span>{{ account.vOptions.map(v => v.type).join(', ') }}</span> -->
							</div>
						</div>

						<Button
							variant="ghost"
							size="icon"
							class="absolute rounded-full -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-[60]"
							@click.stop="onClickRemoveAccount(account)"
						>
							<X class="h-4 w-4" />
						</Button>
					</div>
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
	@apply p-4 h-full border border-border bg-background shadow-xl rounded-xl flex flex-col;
}

.account-drawer-slide-enter-active,
.account-drawer-slide-leave-active {
	transition: transform 0.3s ease-in-out;
}

.account-drawer-slide-enter-from,
.account-drawer-slide-leave-to {
	transform: translateX(100%);
}

/* Custom scrollbar styling */
.overflow-y-auto {
	scrollbar-width: thin;
	scrollbar-color: theme('colors.accent.DEFAULT') transparent;
}

.overflow-y-auto::-webkit-scrollbar {
	width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
	background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
	background-color: theme('colors.accent.DEFAULT');
	border-radius: 20px;
}

/* Add new styles */
.bg-accent\/5 {
	background-color: rgb(var(--accent) / 0.05);
}

.bg-accent\/10 {
	background-color: rgb(var(--accent) / 0.1);
}
</style>
