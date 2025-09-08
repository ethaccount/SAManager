<script setup lang="ts">
import { IS_STAGING } from '@/config'
import { AccountRegistry } from '@/lib/accounts'
import { toRoute } from '@/lib/router'
import { useGetCode } from '@/lib/useGetCode'
import { getVMethodName, getVMethodType } from '@/lib/validations/helpers'
import { useAccount } from '@/stores/account/useAccount'
import { displayChainName } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { shortenAddress } from '@vue-dapp/core'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import { isSameAddress } from 'sendop'

const route = useRoute()
const router = useRouter()
const { selectedAccount, isModular, isChainIdMatching, isMultichain } = useAccount()
const { getCode, isDeployed, loading } = useGetCode()

const isGetCodeFinished = ref(false)

// If the user navigates directly to the account-settings with an address, check if the address matches the selectedAccount
const addressNotFound = ref(false)
try {
	if (selectedAccount.value && !isSameAddress(route.params.address as string, selectedAccount.value.address)) {
		addressNotFound.value = true
	}
} catch {
	addressNotFound.value = true
}

// Only check address if it's not on the "address not found" page
onMounted(async () => {
	if (!addressNotFound.value) {
		await checkAddress()
	}
})

// If on the "address not found" page, users can select another account via the drawer
watch(selectedAccount, async () => {
	addressNotFound.value = false
	await checkAddress()
})

async function checkAddress() {
	if (selectedAccount.value && isChainIdMatching.value) {
		isGetCodeFinished.value = false
		router.replace(
			toRoute(router.currentRoute.value.name as string, {
				address: selectedAccount.value.address,
			}),
		)
		await getCode(selectedAccount.value.address)
		isGetCodeFinished.value = true
	}
}

function onClickSwitchToCorrectChain() {
	if (!selectedAccount.value) return
	useBlockchain().switchChain(selectedAccount.value.chainId)
}

const showSwitchToCorrectChain = computed(() => {
	return !isMultichain.value && !isChainIdMatching.value
})
</script>

<template>
	<CenterStageLayout>
		<div v-if="!selectedAccount" class="w-full mx-auto flex justify-center items-center h-full flex-col gap-4">
			<div class="text-sm text-muted-foreground">Import or create an account to view its settings</div>
			<Button variant="outline" size="sm" @click="router.push(toRoute('home'))">
				<ArrowLeft class="h-3.5 w-3.5" />
				Go to home page
			</Button>
		</div>
		<div v-else-if="addressNotFound" class="w-full mx-auto flex justify-center items-center h-full flex-col gap-4">
			<div class="text-sm text-muted-foreground">Account Not Found</div>
			<Button variant="outline" size="sm" @click="router.push(toRoute('home'))">
				<ArrowLeft class="h-3.5 w-3.5" />
				Go to home page
			</Button>
		</div>
		<div v-else class="w-full mx-auto">
			<div class="space-y-4">
				<div class="space-y-2">
					<!-- address -->
					<div class="flex items-center gap-2">
						<h1 class="text-xl font-medium">{{ shortenAddress(selectedAccount.address) }}</h1>
						<div class="flex items-center gap-1">
							<CopyButton :address="selectedAccount.address" />
							<AddressLinkButton :address="selectedAccount.address" />
						</div>
					</div>

					<!-- account Id -->
					<div class="flex items-center gap-3 mt-2">
						<div>
							<p class="text-sm text-muted-foreground">
								{{ AccountRegistry.getName(selectedAccount.accountId) }} ({{
									selectedAccount.accountId
								}})
							</p>
						</div>
					</div>

					<!-- Chain -->
					<div v-if="!isMultichain">
						<div class="flex items-center gap-2 text-sm">
							<ChainIcon :chain-id="selectedAccount.chainId" :size="20" />
							<div>
								<span>{{ displayChainName(selectedAccount.chainId) }}</span>
								<span v-if="!isChainIdMatching" class="text-yellow-500"> (Chain Mismatch)</span>
							</div>
						</div>
					</div>

					<!-- tag section -->
					<div class="flex items-center gap-2 mt-2">
						<!-- Category -->
						<div class="text-xs rounded-full bg-muted px-2.5 py-0.5">
							{{ selectedAccount.category }}
						</div>

						<!-- Deployed tag -->
						<TooltipProvider
							v-if="isChainIdMatching && !loading && selectedAccount.category === 'Smart Account'"
						>
							<Tooltip>
								<TooltipTrigger asChild>
									<div class="flex items-center gap-1">
										<div
											class="text-xs rounded-full px-2.5 py-0.5"
											:class="isDeployed ? 'bg-blue-500' : 'bg-yellow-500/10 text-yellow-500'"
										>
											{{ isDeployed ? 'Deployed' : 'Not Deployed' }}
										</div>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									{{
										isDeployed
											? `The account is deployed on ${displayChainName(selectedAccount.chainId)}`
											: 'The account is not deployed'
									}}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<!-- Multichain tag -->
						<TooltipProvider v-if="isMultichain">
							<Tooltip>
								<TooltipTrigger asChild>
									<div class="flex items-center gap-1">
										<div class="text-xs rounded-full px-2.5 py-0.5 bg-green-800">Multichain</div>
									</div>
								</TooltipTrigger>
								<TooltipContent> The account can be used on all supported chains</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
			</div>

			<div v-if="showSwitchToCorrectChain" class="mt-4 text-sm text-muted-foreground">
				<p>Please switch to the account's chain to manage it</p>
				<Button variant="outline" size="sm" class="mt-2" @click="onClickSwitchToCorrectChain">
					Switch to {{ displayChainName(selectedAccount.chainId) }}
				</Button>
			</div>

			<div class="mt-4" v-else>
				<!-- Validation Methods -->
				<div class="space-y-4">
					<div class="text-sm font-medium">Validation Methods</div>
					<div class="grid gap-3">
						<div
							v-for="(vMethod, index) in selectedAccount.vMethods"
							:key="index"
							class="group py-3 px-4 bg-card border border-border/40 rounded-lg hover:border-border/60 transition-colors"
						>
							<div class="w-full space-y-2">
								<div class="flex items-center justify-between gap-2">
									<div class="flex items-center gap-2">
										<!-- vMethod name -->
										<div class="text-sm">
											{{ getVMethodName(vMethod) }}
										</div>

										<!-- vMethod type -->
										<div
											class="text-xs px-2.5 py-1 rounded-full font-medium"
											:class="{
												'bg-blue-500/10 text-blue-500': vMethod.type === 'PASSKEY',
												'bg-green-500/10 text-green-500': vMethod.type === 'EOA-Owned',
												'bg-teal-500/10 text-teal-500': vMethod.type === 'MULTI-EOA',
											}"
										>
											{{ getVMethodType(vMethod) }}
										</div>
									</div>
								</div>
								<div class="space-y-1">
									<div
										v-if="vMethod.type === 'EOA-Owned'"
										class="flex items-center gap-2 text-xs text-muted-foreground"
									>
										<span class="font-medium min-w-0">Owner:</span>
										<div class="font-mono flex-1 truncate flex items-center gap-1">
											<span>{{ shortenAddress(vMethod.address) }}</span>
											<CopyButton :address="vMethod.address" size="xs" />
											<AddressLinkButton :address="vMethod.address" size="xs" />
										</div>
									</div>
									<div
										v-if="
											getVMethodType(vMethod) === 'PASSKEY' &&
											vMethod.name === 'WebAuthnValidator' &&
											vMethod.username
										"
										class="flex items-center gap-2 text-xs text-muted-foreground"
									>
										<span class="font-medium min-w-0">Username:</span>
										<span class="flex-1 truncate">
											{{ vMethod.username }}
										</span>
									</div>
									<div v-if="vMethod.type === 'MULTI-EOA'">
										<div class="flex items-center gap-2 text-xs text-muted-foreground">
											<span class="font-medium min-w-0">Owners:</span>
											<div
												v-for="address in vMethod.addresses"
												:key="address"
												class="flex items-center gap-1 text-xs text-muted-foreground"
											>
												<span class="flex-1 truncate">
													{{ shortenAddress(address) }}
												</span>
												<CopyButton :address="address" size="xs" />
												<AddressLinkButton :address="address" size="xs" />
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div v-show="loading" class="flex justify-center py-4">
					<Loader2 class="w-6 h-6 animate-spin text-primary" />
				</div>

				<!-- Ensure the isDeployed is updated before rendering the RouterView -->
				<div v-if="isGetCodeFinished">
					<!-- Note: Must use v-show so that the RouterView will not mount again when the selectedAccount changes -->
					<div v-show="!loading" class="mt-6 mb-[100px]">
						<div class="flex border-b">
							<RouterLink
								:to="toRoute('account-settings-modules', { address: selectedAccount.address })"
								class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
								:class="
									$route.name === 'account-settings-modules'
										? 'border-primary text-primary'
										: 'border-transparent text-muted-foreground hover:text-foreground'
								"
							>
								Modules
							</RouterLink>

							<RouterLink
								:to="toRoute('account-settings-permissions', { address: selectedAccount.address })"
								class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
								:class="
									$route.name === 'account-settings-permissions'
										? 'border-primary text-primary'
										: 'border-transparent text-muted-foreground hover:text-foreground'
								"
							>
								Permissions
							</RouterLink>

							<RouterLink
								:to="toRoute('account-settings-multichain', { address: selectedAccount.address })"
								class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
								:class="
									$route.name === 'account-settings-multichain'
										? 'border-primary text-primary'
										: 'border-transparent text-muted-foreground hover:text-foreground'
								"
							>
								Multichain
							</RouterLink>

							<RouterLink
								v-if="IS_STAGING"
								:to="toRoute('account-settings-email-recovery', { address: selectedAccount.address })"
								class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
								:class="
									$route.name === 'account-settings-email-recovery'
										? 'border-primary text-primary'
										: 'border-transparent text-muted-foreground hover:text-foreground'
								"
							>
								Recovery
							</RouterLink>
						</div>

						<div class="mt-6">
							<RouterView
								v-if="selectedAccount"
								:selected-account="selectedAccount"
								:is-deployed="isDeployed"
								:is-modular="isModular"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</CenterStageLayout>
</template>

<style lang="css" scoped></style>
