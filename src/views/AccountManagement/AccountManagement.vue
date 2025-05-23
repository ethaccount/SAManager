<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toRoute } from '@/lib/router'
import { useGetCode } from '@/lib/useGetCode'
import { displayAccountName } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { displayValidationIdentifier } from '@/stores/validation/validation'
import { shortenAddress } from '@vue-dapp/core'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import AMCrossChain from './AMCrossChain.vue'
import AMModules from './AMModules.vue'
import AMPaymasters from './AMPaymasters.vue'
import AMSessions from './AMSessions.vue'
import { displayChainName } from '@/stores/network/network'
import { useNetwork } from '@/stores/network/useNetwork'

const router = useRouter()
const { selectedAccount, isModular, isChainIdMatching, isCrossChain } = useAccount()
const { getCode, isDeployed, loading } = useGetCode()

// Use this instead of onMounted because users might change account with the drawer
watchImmediate([selectedAccount], async () => {
	if (selectedAccount.value && isChainIdMatching.value) {
		router.replace(toRoute('account-management', { address: selectedAccount.value.address }))
		getCode(selectedAccount.value.address)
	}
})

function onClickSwitchToCorrectChain() {
	if (!selectedAccount.value) return
	useNetwork().switchChain(selectedAccount.value.chainId)
}

const showSwitchToCorrectChain = computed(() => {
	return !isCrossChain && !isChainIdMatching
})
</script>

<template>
	<CenterStageLayout>
		<div v-if="!selectedAccount" class="w-full mx-auto flex justify-center items-center h-full flex-col gap-4">
			<div class="text-sm text-muted-foreground">Import an account to view its settings</div>
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
								{{ displayAccountName(selectedAccount.accountId) }} ({{ selectedAccount.accountId }})
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
				<!-- Validation Options -->
				<div class="space-y-4">
					<div class="text-sm font-medium">Validation Options</div>
					<div class="grid gap-1">
						<div
							v-for="(vOption, index) in selectedAccount.vOptions"
							:key="index"
							class="group flex items-center justify-between py-2 px-3 bg-card border border-border/40 rounded-lg"
						>
							<div class="w-full flex items-center justify-between gap-3">
								<div class="text-xs font-medium px-2.5 py-1 rounded-full bg-muted">
									{{ vOption.type }}
								</div>
								<div class="font-mono text-xs text-muted-foreground flex items-center gap-2">
									<span>{{ shortenAddress(displayValidationIdentifier(vOption)) }}</span>
									<CopyButton :address="displayValidationIdentifier(vOption)" />
								</div>
							</div>
						</div>
					</div>
				</div>

				<div v-if="loading" class="flex justify-center py-4">
					<Loader2 class="w-6 h-6 animate-spin text-primary" />
				</div>

				<Tabs default-value="modules" class="mt-6" v-if="!loading">
					<TabsList class="grid grid-cols-4 w-full">
						<TabsTrigger value="modules">Modules</TabsTrigger>
						<!-- <TabsTrigger value="sessions">Sessions</TabsTrigger>
					<TabsTrigger value="paymasters">Paymasters</TabsTrigger>
					<TabsTrigger value="cross-chain">Cross-chain</TabsTrigger> -->
					</TabsList>

					<TabsContent value="modules" class="mt-6">
						<AMModules
							v-if="selectedAccount"
							:selected-account="selectedAccount"
							:is-deployed="isDeployed"
							:is-modular="isModular"
						/>
					</TabsContent>

					<TabsContent value="sessions" class="mt-6">
						<AMSessions />
					</TabsContent>

					<TabsContent value="paymasters" class="mt-6">
						<AMPaymasters />
					</TabsContent>

					<TabsContent value="cross-chain" class="mt-6">
						<AMCrossChain />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	</CenterStageLayout>
</template>

<style lang="css" scoped></style>
