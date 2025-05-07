<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { displayAccountName } from '@/lib/account'
import { displayChainName } from '@/lib/network'
import { toRoute } from '@/lib/router'
import { useAccounts } from '@/stores/useAccounts'
import { shortenAddress } from '@vue-dapp/core'
import { watchImmediate } from '@vueuse/core'
import { ArrowLeft, Copy, ExternalLink } from 'lucide-vue-next'
import ASModules from './ASModules.vue'
import { displayValidationIdentifier } from '@/stores/validation/validation'

const router = useRouter()
const { selectedAccount, isDeployed } = useAccounts()

watchImmediate(selectedAccount, () => {
	if (selectedAccount.value) {
		router.replace(toRoute('account-settings', { address: selectedAccount.value.address }))
	}
})

const copyToClipboard = (text: string) => {
	navigator.clipboard.writeText(text)
	// In a real app, you would show a toast notification
	console.log('Copied to clipboard:', text)
}

// Mock data for sessions
const sessions = ref([
	{
		id: 'session-1',
		name: 'Mobile App',
		validUntil: new Date('2023-12-31'),
		permissions: 'Transfer ETH, USDC',
	},
	{
		id: 'session-2',
		name: 'Web Dashboard',
		validUntil: new Date('2023-10-15'),
		permissions: 'Read-only',
	},
])

// Mock data for paymasters
const paymasters = [
	{ id: 'open', name: 'Public Paymaster', description: 'General purpose paymaster for gas sponsorship' },
	{ id: 'circle', name: 'Circle USDC Paymaster', description: 'Pay gas fees with USDC' },
]

const selectedPaymaster = ref(paymasters[0])

// Mock data for cross-chain accounts
const crossChainAccounts = [
	{ chain: 'Sepolia', address: '0x1234...5678' },
	{ chain: 'Base', address: '0xabcd...efgh' },
	{ chain: 'Base Sepolia', address: '0x9876...5432' },
]
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
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								@click="copyToClipboard(selectedAccount.address)"
							>
								<Copy class="h-3.5 w-3.5" />
							</Button>
							<Button variant="ghost" size="icon" class="h-7 w-7" as-child>
								<a
									:href="`https://sepolia.etherscan.io/address/${selectedAccount.address}`"
									target="_blank"
									rel="noopener noreferrer"
								>
									<ExternalLink class="h-3.5 w-3.5" />
								</a>
							</Button>
						</div>
					</div>

					<div class="flex items-center gap-3 mt-2">
						<div>
							<p class="text-sm text-muted-foreground">
								{{ displayAccountName(selectedAccount.accountId) }}
							</p>
						</div>
						<div class="text-xs rounded-full bg-muted px-2.5 py-0.5">
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
					<TabsTrigger value="sessions">Sessions</TabsTrigger>
					<TabsTrigger value="paymasters">Paymasters</TabsTrigger>
					<TabsTrigger value="cross-chain">Cross-chain</TabsTrigger>
				</TabsList>

				<TabsContent value="modules" class="mt-6">
					<ASModules />
				</TabsContent>

				<TabsContent value="sessions" class="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Smart Sessions</CardTitle>
							<CardDescription>Manage session keys for your account</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-6">
								<div class="space-y-4">
									<div class="flex items-center justify-between">
										<h3 class="text-sm font-medium">Active Sessions</h3>
										<Button size="sm">Create New Session</Button>
									</div>

									<div v-if="sessions.length === 0" class="text-sm text-muted-foreground">
										No active sessions
									</div>
									<div v-else class="grid gap-3">
										<div
											v-for="session in sessions"
											:key="session.id"
											class="border rounded-md p-4"
										>
											<div class="flex items-start justify-between">
												<div>
													<div class="font-medium">{{ session.name }}</div>
													<div class="text-sm text-muted-foreground mt-1">
														Valid until: {{ session.validUntil.toLocaleDateString() }}
													</div>
													<div class="text-sm mt-2">
														Permissions: {{ session.permissions }}
													</div>
												</div>
												<Button
													variant="outline"
													size="sm"
													@click="sessions = sessions.filter(s => s.id !== session.id)"
												>
													Revoke
												</Button>
											</div>
										</div>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="paymasters" class="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Paymasters</CardTitle>
							<CardDescription>Configure paymaster options for gas sponsorship</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-6">
								<div class="space-y-4">
									<h3 class="text-sm font-medium">Select Default Paymaster</h3>
									<div class="grid gap-3">
										<div
											v-for="paymaster in paymasters"
											:key="paymaster.id"
											class="border rounded-md p-4 cursor-pointer transition-colors"
											:class="[
												selectedPaymaster.id === paymaster.id
													? 'border-primary bg-primary/5'
													: 'hover:bg-accent',
											]"
											@click="selectedPaymaster = paymaster"
										>
											<div class="flex items-start">
												<div class="flex-1">
													<div class="font-medium">{{ paymaster.name }}</div>
													<div class="text-sm text-muted-foreground mt-1">
														{{ paymaster.description }}
													</div>
												</div>
												<div
													class="w-4 h-4 rounded-full border-2"
													:class="[
														selectedPaymaster.id === paymaster.id
															? 'border-primary bg-primary'
															: 'border-muted',
													]"
												/>
											</div>
										</div>
									</div>
								</div>

								<div class="pt-4">
									<Button class="w-full">Save Paymaster Settings</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="cross-chain" class="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Cross-chain Deployments</CardTitle>
							<CardDescription>Your account deployments across different networks</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-6">
								<div class="space-y-4">
									<div class="grid gap-3">
										<div
											v-for="account in crossChainAccounts"
											:key="account.chain"
											class="flex items-center justify-between p-3 border rounded-md"
										>
											<div>
												<div class="font-medium">{{ account.chain }}</div>
												<div class="text-sm text-muted-foreground">{{ account.address }}</div>
											</div>
										</div>
									</div>
								</div>

								<div class="pt-4">
									<Button class="w-full">Deploy to Another Chain</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	</CenterStageLayout>
</template>

<style lang="css" scoped></style>
