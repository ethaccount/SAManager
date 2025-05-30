<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { env } from '@/app/useSetupEnv'
import { toRoute } from '@/lib/router'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { ACCOUNT_ID_TO_NAME, AccountId, displayAccountName, SUPPORTED_ACCOUNTS } from '@/stores/account/account'
import { checkIfAccountIsDeployed, getComputedAddressAndInitCode } from '@/stores/account/create'
import { useAccounts } from '@/stores/account/useAccounts'
import { displayChainName } from '@/stores/blockchain/blockchain'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useTxModal } from '@/stores/useTxModal'
import { useSigner } from '@/stores/validation/useSigner'
import { useAccount } from '@/stores/account/useAccount'
import {
	createEOAOwnedValidation,
	createPasskeyValidation,
	displayValidationName,
	SUPPORTED_VALIDATION_OPTIONS,
	ValidationOption,
	ValidationType,
} from '@/stores/validation/validation'
import { shortenAddress } from '@vue-dapp/core'
import { isAddress } from 'ethers'
import { ChevronRight, Power, AlertCircle } from 'lucide-vue-next'
import { toBytes32 } from 'sendop'

const router = useRouter()
const { client, selectedChainId, switchEntryPoint } = useBlockchain()
const { wallet, address, disconnect } = useEOAWallet()
const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
const { isEOAWalletConnected, isEOAWalletSupported } = useEOAWallet()
const {
	selectedCredentialDisplay,
	isLogin,
	resetCredentialId,
	isFullCredential,
	selectedCredential,
	isPasskeySupported,
} = usePasskey()
const { importAccount, selectAccount, isAccountImported } = useAccounts()

const supportedAccounts = Object.entries(SUPPORTED_ACCOUNTS)
	.filter(([_, data]) => data.isModular)
	.map(([id]) => ({
		id: id as AccountId,
		name: ACCOUNT_ID_TO_NAME[id as AccountId],
		description: `Supports EntryPoint ${SUPPORTED_ACCOUNTS[id as AccountId].entryPointVersion}`,
	}))

const CREATE_ACCOUNT_VALIDATION_RULES: Record<AccountId, ValidationType[]> = {
	[AccountId['kernel.advanced.v0.3.1']]: ['EOA-Owned', 'Passkey'],
	[AccountId['biconomy.nexus.1.0.2']]: ['EOA-Owned', 'Passkey'],
	[AccountId['rhinestone.safe7579.v1.0.0']]: ['EOA-Owned'],
	[AccountId['infinitism.SimpleAccount.0.8.0']]: [],
	[AccountId['infinitism.Simple7702Account.0.8.0']]: [],
} as const

const supportedValidationOptions = computed(() => {
	if (!selectedAccountType.value) return []

	const allowedValidations = CREATE_ACCOUNT_VALIDATION_RULES[selectedAccountType.value]
	return Object.entries(SUPPORTED_VALIDATION_OPTIONS)
		.filter(([key]) => allowedValidations.includes(key as ValidationType))
		.map(([key, data]) => ({
			type: key as ValidationType,
			name: data.name,
			description: data.description,
		}))
})

const selectedAccountType = ref<AccountId | undefined>(undefined)

watch(selectedAccountType, newAccountType => {
	// Reset validation type if not supported by new account type
	if (!newAccountType) {
		selectedValidationType.value = undefined
		return
	}

	const allowedValidations = CREATE_ACCOUNT_VALIDATION_RULES[newAccountType]
	if (selectedValidationType.value && !allowedValidations.includes(selectedValidationType.value)) {
		selectedValidationType.value = undefined
	}

	// Fix EntryPointMismatch: Switch EntryPoint version based on the selected account type
	switchEntryPoint(SUPPORTED_ACCOUNTS[newAccountType].entryPointVersion)
})

// Fix EntryPointMismatch: When users leave Create page, reset the EntryPoint version for the selected account
onBeforeRouteLeave(() => {
	const { selectedAccount } = useAccount()
	if (selectedAccount.value) {
		switchEntryPoint(SUPPORTED_ACCOUNTS[selectedAccount.value.accountId].entryPointVersion)
	}
})

const selectedValidationType = ref<ValidationType | undefined>(undefined)
const isComputingAddress = ref(false)
const showMoreOptions = ref(false)

const selectedValidation = computed<ValidationOption | null>(() => {
	if (!selectedValidationType.value) return null

	switch (selectedValidationType.value) {
		case 'EOA-Owned':
			const { signer } = useEOAWallet()
			if (!signer.value) return null
			return createEOAOwnedValidation(signer.value.address)
		case 'Passkey':
			if (!selectedCredential.value) return null
			return createPasskeyValidation(selectedCredential.value.credentialId)
		default:
			return null
	}
})

// Auto select the signer when the selectedValidation is updated
watchImmediate(selectedValidationType, () => {
	if (selectedValidation.value) {
		const { selectSigner } = useSigner()
		selectSigner(SUPPORTED_VALIDATION_OPTIONS[selectedValidation.value.type].signerType)
	}
})

const saltInput = ref<number | null>(null)
const computedSalt = computed(() => {
	if (!saltInput.value) return env.APP_SALT
	return toBytes32(BigInt(saltInput.value))
})

/**
 * Check if the signer is connected and corresponding to the selected validation type
 */
const isValidationAvailable = computed(() => {
	if (!selectedValidation.value) return false
	return useSigner().isSignerEligibleForValidation([selectedValidation.value])
})

const computedAddress = ref<string>('')
const initCode = ref<string>('')
const isDeployed = ref(false)

const isImported = computed(() => {
	return isAccountImported(computedAddress.value, selectedChainId.value)
})

const errMsg = ref<string | null>(null)

watchImmediate([isValidationAvailable, selectedValidation, isLogin, selectedAccountType, computedSalt], async () => {
	computedAddress.value = ''
	initCode.value = ''
	isDeployed.value = false
	errMsg.value = null

	if (isValidationAvailable.value && selectedValidation.value && selectedAccountType.value && computedSalt.value) {
		isComputingAddress.value = true
		try {
			const res = await getComputedAddressAndInitCode(
				client.value,
				selectedAccountType.value,
				selectedValidation.value,
				computedSalt.value,
			)
			computedAddress.value = res.computedAddress
			initCode.value = res.initCode
			isDeployed.value = await checkIfAccountIsDeployed(client.value, computedAddress.value)
		} catch (error) {
			throw error
		} finally {
			isComputingAddress.value = false
		}
	} else if (!selectedValidation.value) {
		if (selectedValidationType.value === 'Passkey' && isLogin.value && !isFullCredential.value) {
			errMsg.value =
				"This passkey's public key is not stored in the frontend, so it can only be used for signing but not for installing a new webauthn validator. To use a passkey with a public key, please create a new one."
		}
	}
})

function onClickImport() {
	if (!selectedAccountType.value) {
		throw new Error('onClickImport: No account type')
	}

	if (!computedAddress.value) {
		throw new Error('onClickImport: No computed address')
	}

	if (!initCode.value) {
		throw new Error('onClickImport: No init code')
	}

	if (!selectedValidation.value) {
		throw new Error('onClickImport: No validation')
	}

	if (!isImported.value) {
		importAccount(
			{
				accountId: selectedAccountType.value,
				category: 'Smart Account',
				address: computedAddress.value,
				chainId: selectedChainId.value,
				vOptions: [selectedValidation.value],
			},
			initCode.value,
		)
	}

	selectAccount(computedAddress.value, selectedChainId.value)

	router.push(toRoute('account-management', { address: computedAddress.value }))
}

function onClickDeploy() {
	if (!selectedAccountType.value) {
		throw new Error('onClickDeploy: No account type')
	}

	if (!computedAddress.value) {
		throw new Error('onClickDeploy: No computed address')
	}

	if (!initCode.value) {
		throw new Error('onClickDeploy: No init code')
	}

	if (!selectedValidation.value) {
		throw new Error('onClickDeploy: No validation')
	}

	importAccount(
		{
			accountId: selectedAccountType.value,
			category: 'Smart Account',
			address: computedAddress.value,
			chainId: selectedChainId.value,
			vOptions: [selectedValidation.value],
		},
		initCode.value,
	)

	selectAccount(computedAddress.value, selectedChainId.value)

	useTxModal().openModal({
		// Update the deployed status when the transaction status changes
		// When users has deployed and closed the modal, they can't click the deploy button again
		onSuccess: async () => {
			isDeployed.value = await checkIfAccountIsDeployed(client.value, computedAddress.value)
		},
	})
}

const disabledDeployButton = computed(() => {
	return !computedAddress.value || !initCode.value || !selectedValidation.value || isDeployed.value
})

const disabledImportButton = computed(() => {
	return !computedAddress.value || !initCode.value || !selectedValidation.value
})

function onClickPasskeyLogout() {
	resetCredentialId()
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
										? displayAccountName(selectedAccountType)
										: 'Select Account Type'
								}}</span>
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
							<div class="flex flex-col py-1 w-full">
								<div class="flex items-center justify-between w-full">
									<div class="font-medium">{{ supportedAccount.name }}</div>
									<div class="text-xs text-muted-foreground rounded-full bg-muted px-2.5 py-0.5">
										EntryPoint {{ SUPPORTED_ACCOUNTS[supportedAccount.id].entryPointVersion }}
									</div>
								</div>
								<div class="text-xs text-muted-foreground mt-0.5">{{ supportedAccount.id }}</div>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>

				<!-- Validation selector -->
				<Select v-if="selectedAccountType" v-model="selectedValidationType">
					<SelectTrigger class="w-full bg-muted/30 border-border/50 hover:border-primary transition-colors">
						<SelectValue placeholder="Select Validation Type">
							<div class="flex items-center justify-between w-full gap-2">
								{{
									selectedValidationType
										? displayValidationName(selectedValidationType)
										: 'Select Validation Type'
								}}
							</div>
						</SelectValue>
					</SelectTrigger>

					<SelectContent>
						<SelectItem
							v-for="validationOption in supportedValidationOptions"
							:key="validationOption.type"
							:value="validationOption.type"
							class="cursor-pointer"
						>
							<div class="flex flex-col py-1">
								<div class="flex items-center justify-between w-full gap-2">
									<div class="font-medium">{{ validationOption.name }}</div>
								</div>
								<div class="text-xs text-muted-foreground mt-0.5">
									{{ validationOption.description }}
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
					<!-- EOA Wallet Not Supported -->
					<div v-else class="warning-section">
						<div class="flex items-center gap-1.5">
							<AlertCircle class="w-4 h-4" />
							<span> EOA Wallet not supported by this browser </span>
						</div>
					</div>
				</div>

				<div v-if="selectedValidationType === 'Passkey'">
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
							<div class="flex justify-between items-center gap-2 text-sm text-muted-foreground">
								<div>Passkey Connected</div>
								<Button variant="ghost" size="icon" @click="onClickPasskeyLogout">
									<Power class="w-4 h-4" />
								</Button>
							</div>
							<div class="text-xs">
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
						<input
							id="custom-salt"
							v-model="saltInput"
							type="number"
							placeholder="Enter a number for custom salt. Leave empty for default."
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
						{{ isImported ? 'Account Management' : 'Import' }}
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
