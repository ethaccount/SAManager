<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toRoute } from '@/lib/router'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { displayAccountName, ImportedAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useAccounts } from '@/stores/account/useAccounts'
import { useInitCode } from '@/stores/account/useInitCode'
import { displayChainName } from '@/stores/blockchain/blockchain'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useImportAccountModal } from '@/stores/useImportAccountModal'
import { useSigner } from '@/stores/useSigner'
import { shortenAddress } from '@vue-dapp/core'
import { breakpointsTailwind } from '@vueuse/core'
import { AlertCircle, ArrowRight, CheckCircle, CircleDot, Download, Plus, Power, X } from 'lucide-vue-next'
import { isSameAddress } from 'sendop'
import { VueFinalModal } from 'vue-final-modal'
import { useRouter } from 'vue-router'
import { useConfirmModal } from '../ConfirmModal/useConfirmModal'

const emit = defineEmits<{
	(e: 'close'): void
}>()

function onClickCloseSidebar() {
	emit('close')
}

const { accounts } = useAccounts()
const { hasInitCode } = useInitCode()
const { selectedAccount, isAccountConnected, isChainIdMatching, isCrossChain } = useAccount()
const { wallet, address, isEOAWalletConnected, disconnect, isEOAWalletSupported } = useEOAWallet()
const { isLogin, resetCredentialId, selectedCredentialDisplay, isPasskeySupported } = usePasskey()
const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
const { selectSigner, selectedSigner } = useSigner()

const accountList = computed(() =>
	accounts.value.reduce(
		(acc, cur) => {
			const account = {
				...cur,
				isCrossChain: cur.category === 'Smart Account' && hasInitCode(cur.address),
			}

			if (!acc.some(a => isSameAddress(a.address, account.address))) {
				acc.push(account)
			}

			return acc
		},
		[] as (ImportedAccount & { isCrossChain: boolean })[],
	),
)

function onClickSelectAccount(account: ImportedAccount & { isCrossChain: boolean }) {
	const { selectedChainId } = useBlockchain()
	const { isAccountImported, selectAccount, importAccount } = useAccounts()

	if (account.isCrossChain) {
		// Auto import account if it's cross chain, and there's no account imported for this chain
		const isImported = isAccountImported(account.address, selectedChainId.value)
		if (!isImported) {
			// import the account with current chainId if it's cross chain and not imported
			const { isCrossChain, ...acc } = account // eslint-disable-line @typescript-eslint/no-unused-vars

			importAccount({
				...acc,
				chainId: selectedChainId.value,
			})
		}
		selectAccount(account.address, selectedChainId.value)
	} else {
		selectAccount(account.address, account.chainId)
	}
}

function onClickDeleteAccount(account: ImportedAccount) {
	const { openModal } = useConfirmModal()
	openModal({
		title: 'Delete Account',
		message: 'Are you sure you want to delete this account? This action cannot be undone.',
		confirmText: 'Delete',
		cancelText: 'Cancel',
		onResult: confirmed => {
			if (confirmed) {
				useAccounts().removeAccount(account)
			}
		},
	})
}

function onClickUnselectAccount() {
	useAccounts().unselectAccount()
}

const router = useRouter()

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
													:class="isAccountConnected ? 'text-green-500' : 'text-red-500'"
												/>
											</TooltipTrigger>
											<TooltipContent class="z-[1100]">
												{{ isAccountConnected ? 'Connected' : 'Not Connected' }}
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
										<span>{{ displayAccountName(selectedAccount.accountId) }}</span>
										<!-- Long name with ID may cause layout break -->
										<!-- <span>({{ selectedAccount.accountId }})</span> -->
									</div>

									<!-- chain -->
									<div class="flex items-center gap-2 text-xs">
										<div v-if="isCrossChain">
											<span class="text-xs text-muted-foreground">Cross Chain</span>
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
					Account Management
					<ArrowRight class="w-4 h-4" />
				</Button>
			</div>

			<!-- Signers Connection -->
			<div class="mt-4">
				<h3 class="text-sm font-medium tracking-wider">Signers</h3>
				<div class="mt-2 space-y-2">
					<!-- EOA Wallet Signer -->
					<div
						v-if="isEOAWalletSupported"
						class="flex flex-col p-2.5 border rounded-lg transition-all cursor-pointer"
						:class="{ 'bg-secondary/50 border-primary/20': isEOAWalletConnected }"
						@click="isEOAWalletConnected && selectSigner('EOAWallet')"
					>
						<div v-if="!isEOAWalletConnected" class="flex justify-between items-center">
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
						<div v-if="isEOAWalletConnected" class="space-y-1">
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
							<div class="text-[11px] text-muted-foreground font-mono">
								{{ shortenAddress(address || '') }}
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

					<!-- Passkey Signer -->
					<div
						v-if="isPasskeySupported"
						class="flex flex-col p-2.5 border rounded-lg transition-all cursor-pointer"
						:class="{ 'bg-secondary/50 border-primary/20': isLogin }"
						@click="isLogin && selectSigner('Passkey')"
					>
						<div v-if="!isLogin" class="flex justify-between items-center">
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
						<div v-if="isLogin" class="space-y-1">
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
							<div class="text-[11px] text-muted-foreground">
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
								<span class="text-xs truncate">{{ shortenAddress(account.address) }}</span>
								<span v-if="!account.isCrossChain" class="text-xs text-muted-foreground">
									{{ displayChainName(account.chainId) }}
								</span>
								<span v-else class="text-xs text-muted-foreground">Cross Chain</span>
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
