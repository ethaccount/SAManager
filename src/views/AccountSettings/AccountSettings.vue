<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toRoute } from '@/lib/router'
import { displayAccountName } from '@/stores/account/account'
import { checkIfAccountIsDeployed } from '@/stores/account/create'
import { useAccount } from '@/stores/account/useAccount'
import { displayChainName } from '@/stores/network/network'
import { useNetwork } from '@/stores/network/useNetwork'
import { displayValidationIdentifier } from '@/stores/validation/validation'
import { shortenAddress } from '@vue-dapp/core'
import { watchImmediate } from '@vueuse/core'
import { ArrowLeft } from 'lucide-vue-next'
import ASCrossChain from './ASCrossChain.vue'
import ASModules from './ASModules.vue'
import ASPaymasters from './ASPaymasters.vue'
import ASSessions from './ASSessions.vue'

const router = useRouter()
const { client, selectedChainId } = useNetwork()
const { selectedAccount } = useAccount()

const isDeployed = ref(false)

// Use this instead of onMounted because users might change account with the drawer
watchImmediate(selectedAccount, async () => {
	isDeployed.value = false

	if (!selectedAccount.value) {
		throw new Error('No account selected')
	}

	if (selectedAccount.value) {
		router.replace(toRoute('account-settings', { address: selectedAccount.value.address }))
	}

	isDeployed.value = await checkIfAccountIsDeployed(client.value, selectedAccount.value.address)
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
				<div>
					<div class="flex items-center gap-2">
						<h1 class="text-xl font-medium">{{ shortenAddress(selectedAccount.address) }}</h1>
						<div class="flex items-center gap-1">
							<CopyButton :address="selectedAccount.address" />
							<AddressLinkButton :address="selectedAccount.address" />
						</div>
					</div>

					<div class="flex items-center gap-3 mt-2">
						<div>
							<p class="text-sm text-muted-foreground">
								{{ displayAccountName(selectedAccount.accountId) }}
							</p>
						</div>
						<div
							class="text-xs rounded-full bg-muted px-2.5 py-0.5"
							:class="{
								'border border-red-500': selectedAccount.chainId !== selectedChainId,
								'border border-green-500': selectedAccount.chainId === selectedChainId,
							}"
						>
							{{ displayChainName(selectedAccount.chainId) }}
						</div>
						<div class="text-xs rounded-full bg-muted px-2.5 py-0.5">
							{{ selectedAccount.category }}
						</div>
						<div class="flex items-center gap-1">
							<div
								class="text-xs rounded-full px-2.5 py-0.5"
								:class="isDeployed ? 'bg-green-800' : 'bg-yellow-500/10 text-yellow-500'"
							>
								{{ isDeployed ? 'Deployed' : 'Not Deployed' }}
							</div>
						</div>
					</div>
				</div>

				<!-- vOptions -->
				<div class="space-y-4 pt-1">
					<div class="grid gap-1">
						<div
							v-for="(vOption, index) in selectedAccount.vOptions"
							:key="index"
							class="group flex items-center justify-between py-2.5 px-3 bg-card border border-border/40 rounded-lg"
						>
							<div class="w-full flex items-center justify-between gap-3">
								<div class="text-sm font-medium min-w-20">{{ vOption.type }}</div>
								<div class="font-mono text-sm text-muted-foreground">
									{{ displayValidationIdentifier(vOption) }}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Tabs default-value="modules" class="mt-6">
				<TabsList class="grid grid-cols-4 w-full">
					<TabsTrigger value="modules">Modules</TabsTrigger>
					<!-- <TabsTrigger value="sessions">Sessions</TabsTrigger>
					<TabsTrigger value="paymasters">Paymasters</TabsTrigger>
					<TabsTrigger value="cross-chain">Cross-chain</TabsTrigger> -->
				</TabsList>

				<TabsContent value="modules" class="mt-6">
					<ASModules :is-deployed="isDeployed" />
				</TabsContent>

				<TabsContent value="sessions" class="mt-6">
					<ASSessions />
				</TabsContent>

				<TabsContent value="paymasters" class="mt-6">
					<ASPaymasters />
				</TabsContent>

				<TabsContent value="cross-chain" class="mt-6">
					<ASCrossChain />
				</TabsContent>
			</Tabs>
		</div>
	</CenterStageLayout>
</template>

<style lang="css" scoped></style>
