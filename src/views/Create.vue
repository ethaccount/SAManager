<script setup lang="ts">
import { AccountRegistry } from '@/lib/accounts'
import { toRoute } from '@/lib/router'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { useCreate } from '@/lib/useCreate'
import { useBlockchain } from '@/stores/blockchain'
import { displayChainName } from '@/stores/blockchain/chains'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { isAddress } from 'ethers'
import { AlertCircle, ChevronRight, Power } from 'lucide-vue-next'

const router = useRouter() // Must be declared in the component

const {
	selectedAccountType,
	selectedValidationType,
	supportedAccounts,
	supportedValidations,
	errMsg,
	isValidationAvailable,
	showMoreOptions,
	saltInput,
	computedAddress,
	isComputingAddress,
	isDeployed,
	isImported,
	disabledImportButton,
	disabledDeployButton,
	handleImport,
	onClickDeploy,
} = useCreate()
const { selectedCredentialDisplay, isLogin, isPasskeySupported, resetCredentialId } = usePasskey()
const { wallet, address, disconnect, isEOAWalletConnected, isEOAWalletSupported } = useEOAWallet()
const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
const { selectedChainId } = useBlockchain()

function onClickPasskeyLogout() {
	resetCredentialId()
}

function onClickImport() {
	handleImport()

	if (!computedAddress.value) {
		throw new Error('onClickImport: No computed address')
	}
	router.push(toRoute('account-settings', { address: computedAddress.value }))
}
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
								<span class="font-medium">{{
									selectedAccountType
										? AccountRegistry.getName(selectedAccountType)
										: 'Select Account Type'
								}}</span>
							</div>
						</SelectValue>
					</SelectTrigger>

					<SelectContent>
						<SelectItem
							v-for="supportedAccountId in supportedAccounts"
							:key="supportedAccountId"
							:value="supportedAccountId"
							class="cursor-pointer"
						>
							<div class="flex flex-col py-1 w-full">
								<div class="flex items-center justify-between w-full">
									<div class="font-medium">
										{{ AccountRegistry.getName(supportedAccountId) }}
									</div>
									<div class="text-xs text-muted-foreground rounded-full bg-muted px-2.5 py-0.5">
										EntryPoint {{ AccountRegistry.getEntryPointVersion(supportedAccountId) }}
									</div>
								</div>
								<div class="text-xs text-muted-foreground mt-0.5">
									{{ supportedAccountId }}
								</div>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>

				<!-- Validation selector -->
				<Select v-if="selectedAccountType" v-model="selectedValidationType">
					<SelectTrigger class="w-full bg-muted/30 border-border/50 hover:border-primary transition-colors">
						<SelectValue placeholder="Select Validation Type">
							<div class="flex items-center justify-between w-full gap-2">
								{{ selectedValidationType ? selectedValidationType : 'Select Validation Type' }}
							</div>
						</SelectValue>
					</SelectTrigger>

					<SelectContent>
						<SelectItem
							v-for="validationType in supportedValidations"
							:key="validationType.type"
							:value="validationType.type"
							class="cursor-pointer"
						>
							<div class="flex flex-col py-1">
								<div class="flex items-center justify-between w-full gap-2">
									<div class="font-medium">{{ validationType.type }}</div>
								</div>
								<div class="text-xs text-muted-foreground mt-0.5">
									{{ validationType.name }}
								</div>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>

				<!-- Signer connection -->
				<div v-if="selectedValidationType === 'EOA-Owned'">
					<div
						v-if="isEOAWalletSupported"
						class="flex flex-col p-3 border rounded-lg bg-muted/30"
						:class="{ 'bg-secondary': isEOAWalletConnected }"
					>
						<div v-if="!isEOAWalletConnected" class="flex justify-between items-center">
							<span>EOA Wallet</span>
							<Button variant="outline" size="sm" @click="openConnectEOAWallet"> Connect </Button>
						</div>
						<div v-if="isEOAWalletConnected">
							<div class="flex justify-between">
								<div class="flex flex-col gap-1">
									<div class="text-sm">{{ wallet.providerInfo?.name }} Connected</div>
									<div v-if="address" class="text-xs text-muted-foreground">
										<Address :address="address" text-size="xs" button-size="xs" />
									</div>
								</div>
								<Button variant="ghost" size="icon" class="h-6 w-6" @click="disconnect">
									<Power class="w-3.5 h-3.5" />
								</Button>
							</div>
						</div>
					</div>
					<!-- EOA Wallet Not Supported -->
					<div v-else class="warning-section">
						<div class="flex items-center gap-1.5">
							<AlertCircle class="w-4 h-4" />
							<span> EOA Wallet not supported by this browser </span>
						</div>
					</div>
				</div>

				<div v-if="selectedValidationType === 'PASSKEY'">
					<div
						v-if="isPasskeySupported"
						class="flex flex-col p-3 border rounded-lg"
						:class="{ 'bg-secondary': isLogin }"
					>
						<div v-if="!isLogin" class="flex justify-between items-center">
							<span>Passkey</span>
							<Button variant="outline" size="sm" @click="openConnectPasskeyBoth">Connect</Button>
						</div>
						<div v-if="isLogin">
							<div class="flex justify-between items-center gap-2 text-sm">
								<div>Passkey Connected</div>
								<Button variant="ghost" size="icon" class="h-6 w-6" @click="onClickPasskeyLogout">
									<Power class="w-3.5 h-3.5" />
								</Button>
							</div>
							<div class="text-xs text-muted-foreground">
								{{ selectedCredentialDisplay }}
							</div>
						</div>
					</div>
					<!-- Passkey Not Supported -->
					<div v-else class="warning-section">
						<div class="flex items-center gap-1.5">
							<AlertCircle class="w-4 h-4" />
							<span>Passkey not supported by this browser</span>
						</div>
					</div>
				</div>

				<div v-if="isValidationAvailable" class="space-y-3">
					<!-- More Options toggle -->
					<Button
						variant="ghost"
						class="flex items-center gap-2 text-muted-foreground hover:text-foreground"
						@click="showMoreOptions = !showMoreOptions"
					>
						<ChevronRight class="w-4 h-4 transition-transform" :class="{ 'rotate-90': showMoreOptions }" />
						More Options
					</Button>

					<!-- salt input -->
					<div v-if="showMoreOptions" class="flex flex-col gap-1.5">
						<Label for="custom-salt">Custom Salt (Optional)</Label>
						<Input
							id="custom-salt"
							v-model="saltInput"
							type="number"
							placeholder="Enter a number"
							class="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:border-primary transition-colors"
						/>
					</div>
				</div>

				<div v-if="errMsg" class="warning-section">
					{{ errMsg }}
				</div>

				<div v-if="isValidationAvailable" class="p-4 rounded-lg bg-muted/30 space-y-1.5">
					<div class="text-sm text-muted-foreground">Computed Account Address</div>
					<div
						v-if="isComputingAddress"
						class="animate-pulse flex space-x-1.5 items-center bg-background/50 p-2 rounded border border-border/50"
					>
						<div class="h-1 w-1 bg-primary rounded-full animate-bounce"></div>
						<div class="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
						<div class="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
					</div>
					<div
						v-else-if="isAddress(computedAddress)"
						class="font-mono text-sm break-all bg-background/50 p-2 rounded border border-border/50"
					>
						{{ computedAddress }}
					</div>
				</div>

				<div v-if="isDeployed" class="info-section">
					This account is already deployed on {{ displayChainName(selectedChainId) }}
				</div>

				<div
					v-if="isValidationAvailable && computedAddress && !isComputingAddress"
					class="grid grid-cols-2 gap-2"
				>
					<Button variant="default" size="lg" :disabled="disabledImportButton" @click="onClickImport">
						{{ isImported ? 'Settings' : 'Import' }}
					</Button>

					<Button variant="secondary" size="lg" :disabled="disabledDeployButton" @click="onClickDeploy">
						Deploy
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
