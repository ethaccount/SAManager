<script setup lang="ts">
import { AccountRegistry } from '@/lib/accounts'
import { toRoute } from '@/lib/router'
import { useGetCode } from '@/lib/useGetCode'
import {
	getVMethodIdentifier,
	getVMethodName,
	getVMethodType,
	getVMethodValidatorAddress,
} from '@/lib/validations/helpers'
import { useAccount } from '@/stores/account/useAccount'
import { displayChainName } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { shortenAddress } from '@vue-dapp/core'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const { selectedAccount, isModular, isChainIdMatching, isCrossChain } = useAccount()
const { getCode, isDeployed, loading } = useGetCode()

// Timing: App loaded, Account changed
// Use this instead of onMounted because users might change account with the drawer
watchImmediate(selectedAccount, async () => {
	if (selectedAccount.value && isChainIdMatching.value) {
		// Only redirect if we're on the exact account-management route (not on a child route)
		if (router.currentRoute.value.name === 'account-management') {
			router.replace(toRoute('account-modules', { address: selectedAccount.value.address }))
		}
		await getCode(selectedAccount.value.address)
	}
})

function onClickSwitchToCorrectChain() {
	if (!selectedAccount.value) return
	useBlockchain().switchChain(selectedAccount.value.chainId)
}

const showSwitchToCorrectChain = computed(() => {
	return !isCrossChain.value && !isChainIdMatching.value
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
					<div v-if="!isCrossChain">
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

						<!-- Cross-chain tag -->
						<TooltipProvider v-if="isCrossChain">
							<Tooltip>
								<TooltipTrigger asChild>
									<div class="flex items-center gap-1">
										<div class="text-xs rounded-full px-2.5 py-0.5 bg-green-800">Cross Chain</div>
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
							<div class="w-full space-y-3">
								<div class="flex items-center gap-2">
									<div class="text-xs font-medium px-2.5 py-1 rounded-full bg-muted">
										{{ getVMethodName(vMethod) }}
									</div>
									<div
										class="text-xs px-2.5 py-1 rounded-full font-medium"
										:class="
											getVMethodType(vMethod) === 'PASSKEY'
												? 'bg-blue-500/10 text-blue-500'
												: 'bg-green-500/10 text-green-500'
										"
									>
										{{ getVMethodType(vMethod) }}
									</div>
								</div>
								<div class="space-y-1">
									<div
										v-if="getVMethodValidatorAddress(vMethod)"
										class="flex items-center gap-2 text-xs text-muted-foreground"
									>
										<span class="font-medium min-w-0">Validator:</span>
										<div class="font-mono flex-1 truncate flex items-center gap-1">
											<span>{{ shortenAddress(getVMethodValidatorAddress(vMethod)!) }}</span>
											<CopyButton :address="getVMethodValidatorAddress(vMethod)" size="xs" />
											<AddressLinkButton
												:address="getVMethodValidatorAddress(vMethod)"
												size="xs"
											/>
										</div>
									</div>
									<div
										v-if="getVMethodType(vMethod) === 'EOA-Owned'"
										class="flex items-center gap-2 text-xs text-muted-foreground"
									>
										<span class="font-medium min-w-0">Owner:</span>
										<div class="font-mono flex-1 truncate flex items-center gap-1">
											<span>{{ shortenAddress(getVMethodIdentifier(vMethod)) }}</span>
											<CopyButton :address="getVMethodIdentifier(vMethod)" size="xs" />
											<AddressLinkButton :address="getVMethodIdentifier(vMethod)" size="xs" />
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
								</div>
							</div>
						</div>
					</div>
				</div>

				<div v-if="loading" class="flex justify-center py-4">
					<Loader2 class="w-6 h-6 animate-spin text-primary" />
				</div>

				<div v-if="!loading" class="mt-6">
					<div class="flex border-b">
						<RouterLink
							:to="toRoute('account-modules', { address: selectedAccount.address })"
							class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
							:class="
								$route.name === 'account-modules'
									? 'border-primary text-primary'
									: 'border-transparent text-muted-foreground hover:text-foreground'
							"
						>
							Modules
						</RouterLink>

						<RouterLink
							:to="toRoute('account-permissions', { address: selectedAccount.address })"
							class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
							:class="
								$route.name === 'account-permissions'
									? 'border-primary text-primary'
									: 'border-transparent text-muted-foreground hover:text-foreground'
							"
						>
							Permissions
						</RouterLink>

						<RouterLink
							:to="toRoute('account-multichain', { address: selectedAccount.address })"
							class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
							:class="
								$route.name === 'account-multichain'
									? 'border-primary text-primary'
									: 'border-transparent text-muted-foreground hover:text-foreground'
							"
						>
							Multichain
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
	</CenterStageLayout>
</template>

<style lang="css" scoped></style>
