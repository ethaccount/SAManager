<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AccountRegistry } from '@/lib/accounts'
import { AccountWithMultichain, useAccountList } from '@/lib/accounts/useAccountList'
import { toRoute } from '@/lib/router'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { useAccount } from '@/stores/account/useAccount'
import { displayChainName } from '@/stores/blockchain/chains'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useImportAccountModal } from '@/stores/useImportAccountModal'
import { useSigner } from '@/stores/useSigner'
import { shortenAddress } from '@vue-dapp/core'
import { breakpointsTailwind } from '@vueuse/core'
import { concat, keccak256, toBeHex } from 'ethers'
import { AlertCircle, ArrowRight, CheckCircle, CircleDot, Download, Plus, Power, X } from 'lucide-vue-next'
import { VueFinalModal } from 'vue-final-modal'

const emit = defineEmits<{
	(e: 'close'): void
}>()

function onClickCloseSidebar() {
	emit('close')
}

const router = useRouter()

const { selectedAccount, isAccountAccessible, isChainIdMatching, isMultichain } = useAccount()
const { wallet, address, isEOAWalletConnected, disconnect, isEOAWalletSupported } = useEOAWallet()
const { isLogin, resetCredentialId, selectedCredentialDisplay, isPasskeySupported } = usePasskey()
const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
const { selectSigner, selectedSigner } = useSigner()
const { accountList, isAccountSelected, onClickSelectAccount, onClickDeleteAccount, onClickUnselectAccount } =
	useAccountList()

function onClickAccountManagement() {
	if (!selectedAccount.value) return
	router.push(toRoute('account-management', { address: selectedAccount.value.address }))

	if (!xlAndLarger.value) {
		emit('close')
	}
}

function onClickCreateAccount() {
	router.push(toRoute('create'))

	if (!xlAndLarger.value) {
		emit('close')
	}
}

function onClickImportAccount() {
	const { openModal } = useImportAccountModal()
	openModal()
}

const breakpoints = useBreakpoints(breakpointsTailwind)
const xlAndLarger = breakpoints.greaterOrEqual('xl')

// To make sure the key is unique for each account
function getAccountListKey(account: AccountWithMultichain) {
	return keccak256(concat([account.address, toBeHex(account.chainId)]))
}
</script>

<template>
	<VueFinalModal
		class="account-drawer"
		content-class="account-drawer-content"
		:hide-overlay="xlAndLarger ? true : false"
		:background="xlAndLarger ? 'interactive' : 'non-interactive'"
		:content-transition="'account-drawer-slide'"
		:click-to-close="true"
		:esc-to-close="true"
		:lock-scroll="xlAndLarger ? false : true"
		:focus-trap="xlAndLarger ? false : { allowOutsideClick: true }"
	>
		<div class="account-drawer-visual-container">
			<!-- Selected Account -->
			<div class="flex justify-between items-start">
				<div class="w-full flex justify-between items-start gap-2">
					<div>
						<div v-if="selectedAccount" class="p-1.5">
							<div class="flex justify-between items-center mb-1">
								<div class="flex items-center gap-2">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<CircleDot
													class="w-3 h-3"
													:class="isAccountAccessible ? 'text-green-500' : 'text-red-500'"
												/>
											</TooltipTrigger>
											<TooltipContent class="z-[1100]">
												{{ isAccountAccessible ? 'Connected' : 'Not Connected' }}
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>

									<span class="font-medium truncate">
										{{ shortenAddress(selectedAccount.address) }}
									</span>
									<div class="flex items-center gap-1">
										<CopyButton :address="selectedAccount.address" />
										<AddressLinkButton :address="selectedAccount.address" />
									</div>
								</div>
							</div>
							<div class="flex flex-col text-muted-foreground">
								<div class="flex flex-col gap-1">
									<!-- account Id -->
									<div class="flex items-center gap-1 text-xs">
										<span>{{ AccountRegistry.getName(selectedAccount.accountId) }}</span>
										<!-- Long name with ID may cause layout break -->
										<!-- <span>({{ selectedAccount.accountId }})</span> -->
									</div>

									<!-- chain -->
									<div class="flex items-center gap-2 text-xs">
										<div v-if="isMultichain">
											<span class="text-xs text-muted-foreground">Multichain</span>
										</div>
										<div v-else class="flex items-center gap-2">
											<div>
												<span>{{ displayChainName(selectedAccount.chainId) }}</span>
												<span v-if="!isChainIdMatching" class="text-yellow-500">
													(Chain Mismatch)</span
												>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="flex gap-1">
						<Button v-if="selectedAccount" variant="ghost" size="icon" @click="onClickUnselectAccount">
							<Power class="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" @click="onClickCloseSidebar">
							<X class="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			<!-- Buttons -->
			<div class="mt-4" v-if="selectedAccount">
				<Button
					:disabled="!selectedAccount"
					variant="outline"
					class="w-full justify-between"
					@click="onClickAccountManagement"
				>
					Manage Account
					<ArrowRight class="w-4 h-4" />
				</Button>
			</div>

			<!-- Signers -->
			<div class="mt-4">
				<h3 class="text-sm font-medium tracking-wider">Signers</h3>
				<div class="mt-2 space-y-2">
					<!-- EOA Wallet -->
					<div
						v-if="isEOAWalletSupported"
						class="flex flex-col p-2.5 border rounded-lg transition-all"
						:class="{
							'cursor-pointer': isEOAWalletConnected,
							'bg-accent border-primary': selectedSigner?.type === 'EOAWallet',
						}"
						@click="isEOAWalletConnected && selectSigner('EOAWallet')"
					>
						<div v-if="!isEOAWalletConnected" class="pl-2 flex justify-between items-center">
							<span class="text-sm">EOA Wallet</span>
							<Button
								variant="outline"
								size="sm"
								class="h-7 text-xs px-2.5"
								@click="openConnectEOAWallet"
							>
								Connect
							</Button>
						</div>
						<div v-if="isEOAWalletConnected">
							<div class="flex justify-between items-center">
								<div class="flex items-center gap-1.5 text-xs">
									<CheckCircle
										class="w-2.5 h-2.5"
										:class="
											selectedSigner?.type === 'EOAWallet'
												? 'text-green-500'
												: 'text-muted-foreground'
										"
									/>
									<span>{{ wallet.providerInfo?.name }} Connected</span>
								</div>
								<Button variant="ghost" size="icon" class="h-6 w-6" @click="disconnect">
									<Power class="w-3.5 h-3.5" />
								</Button>
							</div>
							<div v-if="address" class="ml-4 text-xs text-muted-foreground font-mono">
								<Address :address="address" text-size="xs" button-size="xs" />
							</div>
						</div>
					</div>

					<!-- EOA Wallet Not Supported -->
					<div v-else class="flex flex-col p-2 border rounded-lg border-border/50 bg-background">
						<div class="flex items-center gap-1.5">
							<AlertCircle class="w-3 h-3 text-muted-foreground/70" />
							<span class="text-xs text-muted-foreground/70">
								EOA Wallet not supported by this browser
							</span>
						</div>
					</div>

					<!-- Passkey -->
					<div
						v-if="isPasskeySupported"
						class="flex flex-col p-2.5 border rounded-lg transition-all"
						:class="{
							'cursor-pointer': isLogin,
							'bg-accent border-primary': selectedSigner?.type === 'Passkey',
						}"
						@click="isLogin && selectSigner('Passkey')"
					>
						<div v-if="!isLogin" class="pl-2 flex justify-between items-center">
							<span class="text-sm">Passkey</span>
							<Button
								variant="outline"
								size="sm"
								class="h-7 text-xs px-2.5"
								@click="openConnectPasskeyBoth"
							>
								Connect
							</Button>
						</div>
						<div v-if="isLogin" class="">
							<div class="flex justify-between items-center">
								<div class="flex items-center gap-1.5 text-xs">
									<CheckCircle
										class="w-2.5 h-2.5"
										:class="
											selectedSigner?.type === 'Passkey'
												? 'text-green-500'
												: 'text-muted-foreground'
										"
									/>
									<span>Passkey Connected</span>
								</div>
								<Button variant="ghost" size="icon" class="h-6 w-6" @click="resetCredentialId">
									<Power class="w-3.5 h-3.5" />
								</Button>
							</div>
							<div class="ml-4 text-xs text-muted-foreground">
								{{ selectedCredentialDisplay }}
							</div>
						</div>
					</div>

					<!-- Passkey Not Supported -->
					<div v-else class="flex flex-col p-2 border rounded-lg border-border/50 bg-background">
						<div class="flex items-center gap-1.5">
							<AlertCircle class="w-3 h-3 text-muted-foreground/70" />
							<span class="text-xs text-muted-foreground/70">Passkey not supported by this browser</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Account List -->
			<div class="mt-4 flex-1 flex flex-col overflow-hidden">
				<div class="flex justify-between items-center">
					<h3 class="text-sm font-medium tracking-wider">Accounts</h3>
					<div class="flex gap-1 mr-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" class="h-7 w-7" @click="onClickImportAccount">
										<Download class="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent class="z-[1100]">Import</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" class="h-7 w-7" @click="onClickCreateAccount">
										<Plus class="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent class="z-[1100]">Create</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
				<!-- Account List Scrollable Container -->
				<div class="mt-2 flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-2">
					<div
						v-for="account in accountList"
						:key="getAccountListKey(account)"
						class="relative group p-3 rounded-lg border transition-colors hover:bg-accent cursor-pointer overflow-visible"
						:class="{
							'bg-accent border-primary': isAccountSelected(account),
						}"
						@click="onClickSelectAccount(account)"
					>
						<div>
							<div class="flex justify-between items-center mb-1">
								<span class="text-xs truncate">{{ shortenAddress(account.address) }}</span>
								<span v-if="!account.isMultichain" class="text-xs text-muted-foreground">
									{{ displayChainName(account.chainId) }}
								</span>
								<span v-else class="text-xs text-muted-foreground">Multichain</span>
								<!-- <span class="text-xs text-muted-foreground">{{ account.type }}</span> -->
							</div>
							<div class="flex justify-between items-center text-xs text-muted-foreground">
								<span>{{ AccountRegistry.getName(account.accountId) }}</span>
								<!-- <span>{{ account.vOptions.map(v => v.type).join(', ') }}</span> -->
							</div>
						</div>

						<Button
							variant="ghost"
							size="icon"
							class="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-[60]"
							@click.stop="onClickDeleteAccount(account)"
						>
							<X class="h-3 w-3" />
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
