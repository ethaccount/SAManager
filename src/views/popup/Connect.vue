<script setup lang="ts">
import NetworkSelector from '@/components/header/NetworkSelector.vue'
import CenterStageLayout from '@/components/layout/CenterStageLayout.vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Address from '@/components/utils/Address.vue'
import { AccountRegistry } from '@/lib/accounts'
import { useAccountList } from '@/lib/accounts/useAccountList'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { useAccount } from '@/stores/account/useAccount'
import { displayChainName } from '@/stores/blockchain/chains'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/useSigner'
import { AlertCircle, CheckCircle, CircleDot, Power, X } from 'lucide-vue-next'
import { SAManagerPopup } from '@samanager/sdk'

const { selectedAccount, isAccountAccessible, isChainIdMatching, isMultichain } = useAccount()
const { wallet, address, isEOAWalletConnected, disconnect, isEOAWalletSupported } = useEOAWallet()
const { isLogin, resetCredentialId, selectedCredentialDisplay, isPasskeySupported } = usePasskey()
const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
const { selectSigner, selectedSigner } = useSigner()
const { accountList, isAccountSelected, onClickSelectAccount, onClickUnselectAccount } = useAccountList()

const route = useRoute()

const chainId = route.query.chainId as string
if (chainId) {
	const popup = new SAManagerPopup({
		debug: true,
		chainId: BigInt(chainId),
		walletRequestHandler: async (method, params) => {
			console.log('method', method)
			console.log('params', params)
		},
	})
}

function onClickConnect() {
	console.log('onClickConnect')
}
</script>

<template>
	<CenterStageLayout>
		<div class="w-full max-w-2xl mx-auto p-6 space-y-6">
			<!-- Header with Network Selector -->
			<div class="flex justify-between items-center mb-6">
				<h1 class="text-2xl font-bold">Connect Wallet</h1>
				<NetworkSelector fixed-chain />
			</div>

			<!-- Selected Account -->
			<div class="mb-6">
				<div class="flex justify-between items-center mb-3">
					<h2 class="text-lg font-semibold">Selected Account</h2>
				</div>
				<div v-if="selectedAccount" class="p-4 border rounded-lg bg-accent/5">
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-3">
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<CircleDot
											class="w-3 h-3"
											:class="isAccountAccessible ? 'text-green-500' : 'text-red-500'"
										/>
									</TooltipTrigger>
									<TooltipContent>
										{{ isAccountAccessible ? 'Connected' : 'Not Connected' }}
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
							<Address :address="selectedAccount.address" text-size="sm" button-size="sm" />
						</div>
						<Button variant="ghost" size="icon" class="h-6 w-6" @click="onClickUnselectAccount">
							<X class="w-4 h-4" />
						</Button>
					</div>
					<div class="flex flex-col text-muted-foreground text-sm gap-1">
						<div class="flex items-center gap-1">
							<span>{{ AccountRegistry.getName(selectedAccount.accountId) }}</span>
						</div>
						<div class="flex items-center gap-2">
							<div v-if="isMultichain">
								<span class="text-muted-foreground">Multichain</span>
							</div>
							<div v-else class="flex items-center gap-2">
								<span>{{ displayChainName(selectedAccount.chainId) }}</span>
								<span v-if="!isChainIdMatching" class="text-yellow-500"> (Chain Mismatch) </span>
							</div>
						</div>
					</div>
				</div>
				<div v-else class="p-4 border rounded-lg border-dashed border-border/50 bg-background/50">
					<div class="flex items-center justify-center text-center">
						<div class="flex items-center gap-2 text-muted-foreground">
							<CircleDot class="w-3 h-3 text-muted-foreground/50" />
							<span class="text-sm">No account selected</span>
						</div>
					</div>
				</div>
				<div class="mt-4">
					<Button class="w-full" :disabled="!selectedAccount || !isAccountAccessible" @click="onClickConnect">
						{{ selectedAccount ? 'Connect' : 'Select an account to connect' }}
					</Button>
				</div>
			</div>

			<!-- Signers -->
			<div class="mb-6">
				<h2 class="text-lg font-semibold mb-3">Signers</h2>
				<div class="space-y-3">
					<!-- EOA Wallet -->
					<div
						v-if="isEOAWalletSupported"
						class="flex flex-col p-3 border rounded-lg transition-all"
						:class="{
							'cursor-pointer': isEOAWalletConnected,
							'bg-accent border-primary': selectedSigner?.type === 'EOAWallet',
						}"
						@click="isEOAWalletConnected && selectSigner('EOAWallet')"
					>
						<div v-if="!isEOAWalletConnected" class="flex justify-between items-center">
							<span class="font-medium">EOA Wallet</span>
							<Button variant="outline" size="sm" class="h-8 text-sm px-3" @click="openConnectEOAWallet">
								Connect
							</Button>
						</div>
						<div v-if="isEOAWalletConnected">
							<div class="flex justify-between items-center">
								<div class="flex items-center gap-2">
									<CheckCircle
										class="w-4 h-4"
										:class="
											selectedSigner?.type === 'EOAWallet'
												? 'text-green-500'
												: 'text-muted-foreground'
										"
									/>
									<span class="font-medium">{{ wallet.providerInfo?.name }} Connected</span>
								</div>
								<Button variant="ghost" size="icon" class="h-8 w-8" @click="disconnect">
									<Power class="w-4 h-4" />
								</Button>
							</div>
							<div v-if="address" class="ml-6 text-sm text-muted-foreground font-mono mt-1">
								<Address :address="address" text-size="sm" button-size="sm" />
							</div>
						</div>
					</div>

					<!-- EOA Wallet Not Supported -->
					<div v-else class="flex flex-col p-3 border rounded-lg border-border/50 bg-background/50">
						<div class="flex items-center gap-2">
							<AlertCircle class="w-4 h-4 text-muted-foreground/70" />
							<span class="text-sm text-muted-foreground/70">
								EOA Wallet not supported by this browser
							</span>
						</div>
					</div>

					<!-- Passkey -->
					<div
						v-if="isPasskeySupported"
						class="flex flex-col p-3 border rounded-lg transition-all"
						:class="{
							'cursor-pointer': isLogin,
							'bg-accent border-primary': selectedSigner?.type === 'Passkey',
						}"
						@click="isLogin && selectSigner('Passkey')"
					>
						<div v-if="!isLogin" class="flex justify-between items-center">
							<span class="font-medium">Passkey</span>
							<Button
								variant="outline"
								size="sm"
								class="h-8 text-sm px-3"
								@click="openConnectPasskeyBoth"
							>
								Connect
							</Button>
						</div>
						<div v-if="isLogin">
							<div class="flex justify-between items-center">
								<div class="flex items-center gap-2">
									<CheckCircle
										class="w-4 h-4"
										:class="
											selectedSigner?.type === 'Passkey'
												? 'text-green-500'
												: 'text-muted-foreground'
										"
									/>
									<span class="font-medium">Passkey Connected</span>
								</div>
								<Button variant="ghost" size="icon" class="h-8 w-8" @click="resetCredentialId">
									<Power class="w-4 h-4" />
								</Button>
							</div>
							<div class="ml-6 text-sm text-muted-foreground mt-1">
								{{ selectedCredentialDisplay }}
							</div>
						</div>
					</div>

					<!-- Passkey Not Supported -->
					<div v-else class="flex flex-col p-3 border rounded-lg border-border/50 bg-background/50">
						<div class="flex items-center gap-2">
							<AlertCircle class="w-4 h-4 text-muted-foreground/70" />
							<span class="text-sm text-muted-foreground/70">Passkey not supported by this browser</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Account List -->
			<div class="flex-1 flex flex-col">
				<div class="mb-3">
					<h2 class="text-lg font-semibold">Accounts</h2>
				</div>

				<!-- Account List Container -->
				<div class="space-y-3">
					<div
						v-for="account in accountList"
						:key="account.address"
						class="relative group p-4 rounded-lg border transition-colors hover:bg-accent cursor-pointer"
						:class="{
							'bg-accent border-primary': isAccountSelected(account),
						}"
						@click="onClickSelectAccount(account)"
					>
						<div>
							<div class="flex justify-between items-center mb-2">
								<Address
									:address="account.address"
									text-size="sm"
									button-size="xs"
									:show-buttons="false"
								/>
								<span v-if="!account.isMultichain" class="text-sm text-muted-foreground">
									{{ displayChainName(account.chainId) }}
								</span>
								<span v-else class="text-sm text-muted-foreground">Multichain</span>
							</div>
							<div class="flex justify-between items-center text-sm text-muted-foreground">
								<span>{{ AccountRegistry.getName(account.accountId) }}</span>
							</div>
						</div>
					</div>

					<!-- Empty State -->
					<div v-if="accountList.length === 0" class="text-center py-8 text-muted-foreground">
						<p>No accounts found</p>
					</div>
				</div>
			</div>
		</div>
	</CenterStageLayout>
</template>

<style lang="css" scoped></style>
