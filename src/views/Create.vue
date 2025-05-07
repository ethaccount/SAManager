<script setup lang="ts">
import { useTransactionModal } from '@/components/TransactionModal/useTransactionModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { SALT } from '@/config'
import { ACCOUNT_ID_TO_NAME, AccountId, displayAccountName, SUPPORTED_ACCOUNTS } from '@/lib/account'
import { toRoute } from '@/lib/router'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { useAccounts } from '@/stores/useAccounts'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useNetwork } from '@/stores/useNetwork'
import { usePasskey } from '@/stores/usePasskey'
import { ValidationIdentifier } from '@/stores/validation/validation'
import { shortenAddress } from '@vue-dapp/core'
import { watchImmediate } from '@vueuse/core'
import { getBytes, hexlify, isAddress, toBeHex } from 'ethers'
import { Power } from 'lucide-vue-next'
import {
	ADDRESS,
	BICONOMY_ATTESTER_ADDRESS,
	EOAValidatorModule,
	KernelV3Account,
	NexusAccount,
	NexusCreationOptions,
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579Account,
	Safe7579CreationOptions,
	toBytes32,
} from 'sendop'
import { toast } from 'vue-sonner'

const VALIDATORS: {
	[key: string]: {
		name: string
		description: string
		type: ValidationIdentifier['type']
	}
} = {
	ECDSA: {
		name: 'ECDSA Validator',
		description: 'Standard EOA wallet signature',
		type: 'EOA-Owned',
	},
	WebAuthn: {
		name: 'WebAuthn Validator',
		description: 'Passkey validation',
		type: 'Passkey',
	},
	// Ownable: {
	// 	name: 'Ownable Validator',
	// 	description: 'Multisig wallet validation',
	// 	type: 'EOA-Owned',
	// },
} as const

const router = useRouter()
const { client, selectedChainId } = useNetwork()
const { wallet, address, disconnect } = useEOAWallet()
const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
const { isEOAWalletConnected } = useEOAWallet()
const { username, isLogin, passkeyLogout } = usePasskey()

const supportedAccounts = Object.entries(SUPPORTED_ACCOUNTS)
	.filter(([_, data]) => data.isModular)
	.map(([id]) => ({
		id: id as AccountId,
		name: ACCOUNT_ID_TO_NAME[id as AccountId],
		description: `Supports EntryPoint ${SUPPORTED_ACCOUNTS[id as AccountId].entryPointVersion}`,
	}))

const selectedAccountType = ref<AccountId>(supportedAccounts[0].id)
const shouldDeploy = ref(false)
const isComputingAddress = ref(false)

const selectedValidator = ref<Extract<keyof typeof VALIDATORS, string>>('ECDSA')
const selectedValidationType = computed(() => VALIDATORS[selectedValidator.value].type)

// Add custom salt handling
const customSalt = ref<number | null>(null)
const computedSalt = computed(() => {
	if (!customSalt.value) return SALT
	console.log(customSalt.value)
	return toBytes32(BigInt(customSalt.value))
})

const { signer } = useEOAWallet()

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

const vOptionPublicKey = computed(() => {
	if (!selectedValidator.value) return false
	switch (selectedValidationType.value) {
		case 'EOA-Owned':
			return signer.value?.address
		case 'Passkey':
			// TODO: Add passkey connection check
			return false
		default:
			return false
	}
})

function onClickReview() {
	const { importAccount, selectAccount } = useAccounts()

	if (!computedAddress.value) {
		throw new Error('onClickImport: Invalid computed address')
	}

	if (!initCode.value) {
		throw new Error('onClickImport: Invalid init code')
	}

	if (!vOptionPublicKey.value) {
		throw new Error('onClickImport: Invalid validator public key')
	}

	importAccount({
		accountId: selectedAccountType.value,
		category: 'Smart Account',
		address: computedAddress.value,
		chainId: selectedChainId.value,
		vOptions: [
			{
				type: selectedValidationType.value,
				identifier: vOptionPublicKey.value,
			},
		],
		initCode: initCode.value,
	})

	selectAccount(computedAddress.value, selectedChainId.value)

	useTransactionModal().openModal([])
}

function onClickImport() {
	const { importAccount, selectAccount } = useAccounts()

	if (!computedAddress.value) {
		throw new Error('onClickImport: Invalid computed address')
	}

	if (!initCode.value) {
		throw new Error('onClickImport: Invalid init code')
	}

	if (!vOptionPublicKey.value) {
		throw new Error('onClickImport: Invalid validator public key')
	}

	importAccount({
		accountId: selectedAccountType.value,
		category: 'Smart Account',
		address: computedAddress.value,
		chainId: selectedChainId.value,
		vOptions: [
			{
				type: selectedValidationType.value,
				identifier: vOptionPublicKey.value,
			},
		],
		initCode: initCode.value,
	})

	toast.success('Account imported successfully')

	selectAccount(computedAddress.value, selectedChainId.value)

	router.push(toRoute('account-settings', { address: computedAddress.value }))
}

const computedAddress = ref<string>('')
const initCode = ref<string>('')

watchImmediate([isSignerConnected, selectedValidator, selectedAccountType, computedSalt], async () => {
	if (isSignerConnected.value && selectedValidator.value && selectedAccountType.value && computedSalt.value) {
		isComputingAddress.value = true
		try {
			switch (selectedValidator.value) {
				case 'ECDSA':
					if (!signer.value) {
						throw new Error('No signer found')
					}

					switch (selectedAccountType.value) {
						case AccountId['kernel.advanced.v0.3.1']:
							{
								const creationOption = {
									salt: computedSalt.value,
									validatorAddress: ADDRESS.ECDSAValidator,
									validatorInitData: EOAValidatorModule.getInitData(signer.value.address),
								}
								computedAddress.value = await KernelV3Account.computeAccountAddress(
									client.value,
									creationOption,
								)
								initCode.value = KernelV3Account.getInitCode(creationOption)
							}
							break
						case AccountId['biconomy.nexus.1.0.2']:
							{
								const creationOption: NexusCreationOptions = {
									salt: computedSalt.value,
									validatorAddress: ADDRESS.ECDSAValidator,
									validatorInitData: EOAValidatorModule.getInitData(signer.value.address),
									bootstrap: 'initNexusWithSingleValidator',
									registryAddress: ADDRESS.Registry,
									attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
									threshold: 1,
								}
								computedAddress.value = await NexusAccount.computeAccountAddress(
									client.value,
									creationOption,
								)
								initCode.value = NexusAccount.getInitCode(creationOption)
							}
							break
						case AccountId['rhinestone.safe7579.v1.0.0']:
							{
								const creationOption: Safe7579CreationOptions = {
									salt: computedSalt.value,
									validatorAddress: ADDRESS.ECDSAValidator,
									validatorInitData: EOAValidatorModule.getInitData(signer.value.address),
									owners: [signer.value.address],
									ownersThreshold: 1,
									attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
									attestersThreshold: 1,
								}
								computedAddress.value = await Safe7579Account.computeAccountAddress(
									client.value,
									creationOption,
								)
								initCode.value = Safe7579Account.getInitCode(creationOption)
							}
							break
					}
					break
				case 'WebAuthn':
					// computedAddress.value = await WebAuthnValidator.computeAccountAddress(client.value, {
					// 	salt: computedSalt.value,
					// 	validatorAddress: VALIDATORS[selectedValidator.value].address,
					// 	validatorInitData: '',
					// })
					break
			}
		} catch (error) {
			console.error('Error computing address:', error)
		} finally {
			isComputingAddress.value = false
		}
	}
})
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
						<SelectItem
							v-for="supportedAccount in supportedAccounts"
							:key="supportedAccount.id"
							:value="supportedAccount.id"
							class="cursor-pointer"
						>
							<div class="flex flex-col py-1">
								<div class="flex items-center justify-between w-full">
									<span class="font-medium">{{ supportedAccount.name }}</span>
									<span class="text-xs text-muted-foreground rounded-full bg-muted px-2.5 py-0.5">
										EntryPoint {{ SUPPORTED_ACCOUNTS[supportedAccount.id].entryPointVersion }}
									</span>
								</div>
								<span class="text-xs text-muted-foreground mt-0.5">{{ supportedAccount.id }}</span>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>

				<!-- Validation selector -->
				<Select v-model="selectedValidator">
					<SelectTrigger class="w-full bg-muted/30 border-border/50 hover:border-primary transition-colors">
						<SelectValue placeholder="Select Validation Type">
							<div class="flex items-center justify-between w-full gap-2">
								<div>{{ VALIDATORS[selectedValidator].name }}</div>
								<div class="text-xs text-muted-foreground">
									{{ VALIDATORS[selectedValidator].type }}
								</div>
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
								<div class="flex items-center justify-between w-full gap-2">
									<span class="font-medium">{{ validator.name }}</span>
									<span class="text-xs text-muted-foreground">
										{{ validator.type }}
									</span>
								</div>
								<span class="text-xs text-muted-foreground mt-0.5">
									{{ validator.description }}
								</span>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>

				<!-- Signer connection -->
				<div v-if="selectedValidator === 'ECDSA'">
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

				<div v-if="selectedValidator === 'WebAuthn'">
					<div class="flex flex-col p-3 border rounded-lg" :class="{ 'bg-secondary': isLogin }">
						<div v-if="!isLogin" class="flex justify-between items-center">
							<span>Passkey</span>
							<Button variant="outline" size="sm" @click="openConnectPasskeyBoth">Connect</Button>
						</div>
						<div v-if="isLogin" class="">
							<div class="flex justify-between items-center gap-2 text-sm text-muted-foreground">
								<div>Passkey Connected</div>
								<Button variant="ghost" size="icon" @click="passkeyLogout">
									<Power class="w-4 h-4" />
								</Button>
							</div>
							<div class="text-xs">
								{{ username }}
							</div>
						</div>
					</div>
				</div>

				<div v-if="isSignerConnected" class="space-y-3">
					<!-- Add custom salt input -->
					<div class="flex flex-col gap-1.5">
						<Label for="custom-salt">Custom Salt (Optional)</Label>
						<input
							id="custom-salt"
							v-model="customSalt"
							type="number"
							placeholder="Enter a number for custom salt"
							class="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:border-primary transition-colors"
						/>
						<span class="text-xs text-muted-foreground">Leave empty to use default salt</span>
					</div>

					<div class="flex items-center space-x-2">
						<Switch id="deploy-switch" v-model="shouldDeploy" />
						<Label for="deploy-switch">Deploy Contract</Label>
					</div>
				</div>

				<div v-if="isSignerConnected" class="p-4 rounded-lg bg-muted/30 space-y-1.5">
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
