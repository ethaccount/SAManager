<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IS_PRODUCTION, IS_STAGING, MAINNET_URL, TESTNET_URL } from '@/config'
import { toRoute } from '@/lib/router'
import { useImportAccountModal } from '@/stores/useImportAccountModal'
import { Plus, Wallet } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import packageJson from '../../package.json'

async function onClickImportAccount() {
	await useImportAccountModal().openModal()
}

function onClickSourceCode() {
	window.open(packageJson.repository, '_blank')
}

function onClickEnvironmentSwitch() {
	if (IS_STAGING) {
		window.open(MAINNET_URL, '_blank')
	} else if (IS_PRODUCTION) {
		window.open(TESTNET_URL, '_blank')
	}
}
</script>

<template>
	<div class="flex flex-col">
		<!-- Hero Section -->
		<div class="flex flex-col items-center justify-center px-4 py-12 sm:py-16">
			<div class="text-center space-y-4 max-w-3xl">
				<h1
					class="py-1 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
				>
					Smart Account Manager
				</h1>
				<p class="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
					{{ packageJson.description }}
				</p>
			</div>

			<div class="flex flex-col sm:flex-row gap-3 mt-8">
				<Button variant="outline" class="h-10 w-56 px-6" @click="onClickImportAccount">
					<Plus class="w-4 h-4 mr-2" />
					Import Existing Account
				</Button>

				<RouterLink :to="toRoute('create')">
					<Button class="h-10 w-56 px-6">
						<Wallet class="w-4 h-4 mr-2" />
						Create New Account
					</Button>
				</RouterLink>
			</div>
		</div>

		<!-- Features Section -->
		<div class="bg-muted/30 py-12 sm:py-16">
			<div class="container mx-auto px-4 max-w-5xl">
				<div class="text-center space-y-4 mb-12">
					<h2 class="text-xl sm:text-2xl font-bold tracking-tight">Interoperability Across Smart Accounts</h2>
					<p class="text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
						Smart accounts can be decentralized and are not locked into any specific wallet provider,
						including SAManager itself.
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<Card
						class="group border border-border/50 hover:border-primary/50 hover:shadow-md transition-all duration-300"
					>
						<CardHeader class="text-center pb-4">
							<div
								class="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-lg"
							>
								🔗
							</div>
							<CardTitle class="text-lg">Interoperable</CardTitle>
							<CardDescription class="text-sm leading-relaxed">
								Works across different smart account implementations
							</CardDescription>
						</CardHeader>
					</Card>

					<Card
						class="group border border-border/50 hover:border-primary/50 hover:shadow-md transition-all duration-300"
					>
						<CardHeader class="text-center pb-4">
							<div
								class="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-lg"
							>
								🔐
							</div>
							<CardTitle class="text-lg">Self-Custodial</CardTitle>
							<CardDescription class="text-sm leading-relaxed">
								Access to your accounts using EOAs or Passkeys
							</CardDescription>
						</CardHeader>
					</Card>

					<Card
						class="group border border-border/50 hover:border-primary/50 hover:shadow-md transition-all duration-300"
					>
						<CardHeader class="text-center pb-4">
							<div
								class="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-lg"
							>
								⚡
							</div>
							<CardTitle class="text-lg">ERC-4337</CardTitle>
							<CardDescription class="text-sm leading-relaxed">
								Built on the Account Abstraction standard
							</CardDescription>
						</CardHeader>
					</Card>
				</div>
			</div>
		</div>

		<!-- Resources Section -->
		<div class="py-12 sm:py-16 mb-12">
			<div class="container mx-auto px-4 max-w-4xl text-center space-y-8">
				<div class="space-y-3">
					<h3 class="text-xl sm:text-2xl font-bold tracking-tight">Developer Resources</h3>
					<p class="text-sm sm:text-base text-muted-foreground">
						SDKs, libraries, documentation, and integration demos
					</p>
				</div>

				<div class="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
					<a
						href="https://github.com/ethaccount/SAManager/tree/main/packages/sdk"
						target="_blank"
						rel="noopener noreferrer"
						class="block"
					>
						<Button variant="outline" class="w-full h-9">SAManager SDK</Button>
					</a>
					<a
						href="https://github.com/ethaccount/sendop"
						target="_blank"
						rel="noopener noreferrer"
						class="block"
					>
						<Button variant="outline" class="w-full h-9">sendop Library</Button>
					</a>
					<a
						href="https://hackmd.io/@ZtktAkBVTlOtaS8TkcZO2g/HkiPnQM8eg"
						target="_blank"
						rel="noopener noreferrer"
						class="block"
					>
						<Button variant="outline" class="w-full h-9">Documentation</Button>
					</a>
					<a
						href="https://johnson86tw.github.io/dapp5792/"
						target="_blank"
						rel="noopener noreferrer"
						class="block"
					>
						<Button variant="outline" class="w-full h-9">Integration Demo</Button>
					</a>
					<Button @click="onClickSourceCode" variant="outline" class="w-full h-9 gap-1"> GitHub </Button>
					<Button
						v-if="IS_STAGING || IS_PRODUCTION"
						@click="onClickEnvironmentSwitch"
						variant="outline"
						class="w-full h-9"
					>
						{{ IS_STAGING ? 'Mainnet' : 'Testnet' }}
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="css" scoped></style>
