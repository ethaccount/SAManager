<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { DISABLE_SCHEDULING } from '@/config'
import { toRoute } from '@/lib/router'
import { useImportAccountModal } from '@/stores/useImportAccountModal'
import { Plus, Wallet } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import packageJson from '../../package.json'

async function onClickImportAccount() {
	await useImportAccountModal().openModal()
}
</script>

<template>
	<div class="flex flex-col items-center justify-center gap-8 py-8">
		<div class="text-center space-y-4">
			<h1 class="text-3xl sm:text-4xl font-bold tracking-tight">Smart Account Manager</h1>
			<p class="text-lg sm:text-xl text-muted-foreground max-w-2xl" style="text-wrap: balance">
				{{ packageJson.description }}
			</p>
		</div>

		<div class="inline-flex justify-center gap-2 w-auto px-4">
			<Button size="lg" variant="outline" @click="onClickImportAccount">
				<Plus class="w-5 h-5 mr-2" />
				<span class="hidden sm:inline">Import Existing Account</span>
				<span class="sm:hidden">Import</span>
			</Button>

			<RouterLink :to="toRoute('create')">
				<Button size="lg" variant="default">
					<Wallet class="w-5 h-5 mr-2" />
					<span class="hidden sm:inline">Create New Account</span>
					<span class="sm:hidden">Create</span>
				</Button>
			</RouterLink>
		</div>

		<div class="grid gap-2 sm:gap-6 grid-cols-1 sm:grid-cols-2 w-full max-w-2xl">
			<Card class="flex flex-col">
				<CardHeader class="pb-1 sm:pb-6 pt-3 sm:pt-6">
					<CardTitle class="text-xl mb-1">Send</CardTitle>
					<CardDescription class="text-base leading-relaxed" style="text-wrap: balance">
						Send tokens or execute transactions with your account.
					</CardDescription>
				</CardHeader>
				<CardFooter class="mt-auto pt-1 sm:pt-0 pb-3 sm:pb-6 flex justify-start">
					<RouterLink :to="toRoute('send-token')">
						<Button
							variant="outline"
							class="px-6 h-9 sm:h-10 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
						>
							Get Started
						</Button>
					</RouterLink>
				</CardFooter>
			</Card>

			<Card class="flex flex-col">
				<CardHeader class="pb-1 sm:pb-6 pt-3 sm:pt-6">
					<CardTitle class="text-xl mb-1">Scheduling</CardTitle>
					<CardDescription class="text-base leading-relaxed" style="text-wrap: balance">
						Schedule recurring transfers and manage automated tasks.
					</CardDescription>
				</CardHeader>
				<CardFooter class="mt-auto pt-1 sm:pt-0 pb-3 sm:pb-6 flex justify-start">
					<RouterLink v-if="!DISABLE_SCHEDULING" :to="toRoute('scheduling-transfer')">
						<Button
							variant="outline"
							class="px-6 h-9 sm:h-10 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
						>
							Get Started
						</Button>
					</RouterLink>
					<Button v-else variant="outline" disabled class="px-6 h-9 sm:h-10 text-sm font-medium"
						>Coming Soon</Button
					>
				</CardFooter>
			</Card>
		</div>
	</div>
</template>

<style lang="css" scoped></style>
