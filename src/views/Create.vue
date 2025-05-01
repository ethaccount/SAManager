<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ACCOUNT_ID_TO_NAME, AccountId, displayAccountName, SUPPORTED_ACCOUNTS, ValidationType } from '@/lib/account'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { shortenAddress, useVueDapp } from '@vue-dapp/core'
import { isAddress } from 'ethers'
import { Power } from 'lucide-vue-next'

const { wallet, address, isConnected: isEOAWalletConnected, disconnect } = useVueDapp()
const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()

const accountTypes = Object.entries(SUPPORTED_ACCOUNTS)
	.filter(([_, data]) => !data.onlySmartEOA)
	.map(([id]) => ({
		id: id as AccountId,
		name: ACCOUNT_ID_TO_NAME[id as AccountId],
		description: `Supports EntryPoint ${SUPPORTED_ACCOUNTS[id as AccountId].entryPointVersion}`,
	}))

const selectedAccountType = ref<AccountId>(accountTypes[0].id)
const shouldDeploy = ref(false)
const computedAddress = ref<string>('')

const selectedValidator = ref<Extract<keyof typeof VALIDATORS, string>>('ECDSA')
const selectedValidationType = computed(() => VALIDATORS[selectedValidator.value].type)

const isSignerConnected = computed(() => {
	if (!selectedValidator.value) return false
	switch (selectedValidationType.value) {
		case 'EOA-Owned':
			return isEOAWalletConnected.value
		case 'Passkey':
			// TODO: Add passkey connection check
			return false
		default:
			return false
	}
})

const onClickReview = () => {
	console.log('Review')
}

const onClickImport = () => {
	console.log('Import')
}

const VALIDATORS: {
	[key: string]: {
		name: string
		description: string
		type: ValidationType
	}
} = {
	ECDSA: {
		name: 'EOA-Owned',
		description: 'Standard EOA wallet signature',
		type: 'EOA-Owned',
	},
	WebAuthn: {
		name: 'Passkey',
		description: 'Passkey validation',
		type: 'Passkey',
	},
	// Ownable: {
	// 	name: 'Ownable Validator',
	// 	description: 'Multisig wallet validation',
	// 	type: 'EOA-Owned',
	// },
} as const
</script>

<template>
	<CenterStageLayout>
		<Card class="w-full bg-background/50 backdrop-blur-sm border-none shadow-none">
			<CardHeader>
				<CardTitle class="text-center">Create Account</CardTitle>
			</CardHeader>

			<CardContent class="space-y-5">
				<!-- Account type selector -->
				<Select v-model="selectedAccountType">
					<SelectTrigger class="w-full bg-muted/30 border-border/50 hover:border-primary transition-colors">
						<SelectValue placeholder="Select Account Type">
							<div class="flex items-center justify-between w-full">
								<span class="font-medium">{{ displayAccountName(selectedAccountType) }}</span>
							</div>
						</SelectValue>
					</SelectTrigger>

					<SelectContent>
						<SelectItem v-for="type in accountTypes" :key="type.id" :value="type.id" class="cursor-pointer">
							<div class="flex flex-col py-1">
								<div class="flex items-center justify-between w-full">
									<span class="font-medium">{{ type.name }}</span>
									<span class="text-xs text-muted-foreground rounded-full bg-muted px-2.5 py-0.5">
										EntryPoint {{ SUPPORTED_ACCOUNTS[type.id].entryPointVersion }}
									</span>
								</div>
								<span class="text-xs text-muted-foreground mt-0.5">{{ type.id }}</span>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>

				<!-- Validator selector -->
				<Select v-model="selectedValidator">
					<SelectTrigger class="w-full bg-muted/30 border-border/50 hover:border-primary transition-colors">
						<SelectValue placeholder="Select Validation Type">
							<div class="flex items-center justify-between w-full">
								{{ VALIDATORS[selectedValidator].name }}
							</div>
						</SelectValue>
					</SelectTrigger>

					<SelectContent>
						<SelectItem
							v-for="(validator, id) in VALIDATORS"
							:key="id"
							:value="String(id)"
							class="cursor-pointer"
						>
							<div class="flex flex-col py-1">
								<span class="font-medium">{{ validator.name }}</span>
								<span class="text-xs text-muted-foreground mt-0.5">
									{{ validator.description }}
								</span>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>

				<!-- Signer connection -->
				<div v-if="selectedValidator">
					<div
						class="flex flex-col p-3 border rounded-lg bg-muted/30"
						:class="{ 'bg-secondary': isEOAWalletConnected }"
					>
						<div v-if="!isEOAWalletConnected" class="flex justify-between items-center">
							<span>EOA Wallet</span>
							<Button variant="outline" size="sm" @click="openConnectEOAWallet"> Connect </Button>
						</div>
						<div v-if="isEOAWalletConnected" class="">
							<div class="flex justify-between">
								<div class="flex flex-col gap-1">
									<div class="text-sm text-muted-foreground">
										{{ wallet.providerInfo?.name }} Connected
									</div>
									<div class="text-xs">
										{{ shortenAddress(address || '') }}
									</div>
								</div>
								<Button variant="ghost" size="icon" @click="disconnect">
									<Power class="w-4 h-4" />
								</Button>
							</div>
						</div>
					</div>
				</div>

				<div v-if="isSignerConnected" class="space-y-3">
					<div class="flex items-center space-x-2">
						<Switch id="deploy" v-model="shouldDeploy" />
						<Label for="deploy">Deploy Contract</Label>
					</div>
				</div>

				<div
					v-if="isSignerConnected && isAddress(computedAddress)"
					class="p-4 rounded-lg bg-muted/30 space-y-1.5"
				>
					<div class="text-sm text-muted-foreground">Computed Account Address</div>
					<div class="font-mono text-sm break-all bg-background/50 p-2 rounded border border-border/50">
						{{ computedAddress }}
					</div>
				</div>

				<div class="mt-6">
					<Button
						v-if="!shouldDeploy"
						class="w-full bg-primary/90 hover:bg-primary disabled:opacity-50"
						size="lg"
						:disabled="!computedAddress"
						@click="onClickImport"
					>
						Import Account
					</Button>
					<Button
						v-else
						class="w-full bg-primary/90 hover:bg-primary disabled:opacity-50"
						size="lg"
						:disabled="!computedAddress"
						@click="onClickReview"
					>
						Review
					</Button>
				</div>
			</CardContent>
		</Card>
	</CenterStageLayout>
</template>

<style lang="css" scoped>
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
	-webkit-appearance: none;
	margin: 0;
}

:deep(.select-content) {
	@apply w-[var(--radix-select-trigger-width)];
}
</style>
