<script setup lang="ts">
import { env } from '@/app/useSetupEnv'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Deployment, getDeployment } from '@/lib/accounts/getDeployment'
import { toRoute } from '@/lib/router'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { useGetCode } from '@/lib/useGetCode'
import {
	ECDSAValidatorVMethod,
	OwnableValidatorSingleVMethod,
	serializeValidationMethod,
	Simple7702ValidatorVMethod,
	ValidationMethod,
	ValidationMethodName,
	WebAuthnValidatorVMethod,
} from '@/lib/validation-methods'
import { ACCOUNT_ID_TO_NAME, AccountId, displayAccountName, SUPPORTED_ACCOUNTS } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useAccounts } from '@/stores/account/useAccounts'
import { displayChainName } from '@/stores/blockchain/blockchain'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useTxModal } from '@/stores/useTxModal'
import { useSigner } from '@/stores/validation/useSigner'
import { shortenAddress } from '@vue-dapp/core'
import { concat, isAddress } from 'ethers'
import { AlertCircle, ChevronRight, Power } from 'lucide-vue-next'
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

const ACCOUNT_SUPPORTED_INITIAL_VALIDATION_METHOD: Record<AccountId, ValidationMethodName[]> = {
	[AccountId['kernel.advanced.v0.3.1']]: ['ECDSAValidator', 'WebAuthnValidator'],
	[AccountId['biconomy.nexus.1.0.2']]: ['OwnableValidator', 'WebAuthnValidator'],
	[AccountId['rhinestone.safe7579.v1.0.0']]: ['OwnableValidator'],
	[AccountId['infinitism.Simple7702Account.0.8.0']]: [],
} as const

const VALIDATION_METHOD_DISPLAY = {
	ECDSAValidator: { name: ECDSAValidatorVMethod.name, description: ECDSAValidatorVMethod.description },
	WebAuthnValidator: { name: WebAuthnValidatorVMethod.name, description: WebAuthnValidatorVMethod.description },
	OwnableValidator: {
		name: OwnableValidatorSingleVMethod.name,
		description: OwnableValidatorSingleVMethod.description,
	},
} as const

const supportedValidationMethods = computed(() => {
	if (!selectedAccountType.value) return []

	const allowedValidations = ACCOUNT_SUPPORTED_INITIAL_VALIDATION_METHOD[selectedAccountType.value]
	return allowedValidations.map(methodName => ({
		type: methodName,
		name: VALIDATION_METHOD_DISPLAY[methodName].name,
		description: VALIDATION_METHOD_DISPLAY[methodName].description,
	}))
})

const selectedAccountType = ref<AccountId | undefined>(undefined)

watch(selectedAccountType, newAccountType => {
	// Reset validation type if not supported by new account type
	if (!newAccountType) {
		selectedValidationType.value = undefined
		return
	}

	const allowedValidations = ACCOUNT_SUPPORTED_INITIAL_VALIDATION_METHOD[newAccountType]
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

const selectedValidationType = ref<ValidationMethodName | undefined>(undefined)
const isComputingAddress = ref(false)
const showMoreOptions = ref(false)

const selectedValidation = computed<ValidationMethod | null>(() => {
	if (!selectedValidationType.value) return null

	const { signer } = useEOAWallet()

	switch (selectedValidationType.value) {
		case 'ECDSAValidator':
			if (!signer.value) {
				throw new Error('[selectedValidation] signer is null')
			}
			return new ECDSAValidatorVMethod(signer.value.address)
		case 'OwnableValidator':
			if (!signer.value) {
				throw new Error('[selectedValidation] signer is null')
			}
			return new OwnableValidatorSingleVMethod(signer.value.address)
		case 'Simple7702Account':
			if (!signer.value) {
				throw new Error('[selectedValidation] signer is null')
			}
			return new Simple7702ValidatorVMethod(signer.value.address)
		case 'WebAuthnValidator':
			if (!selectedCredential.value) return null
			return new WebAuthnValidatorVMethod(selectedCredential.value)

		default:
			return null
	}
})

// Auto select the signer when the selectedValidation is updated
watchImmediate(selectedValidationType, () => {
	if (selectedValidationType.value) {
		const { selectSigner } = useSigner()
		// Map validation method to signer type
		const signerTypeMap = {
			ECDSAValidator: 'EOAWallet',
			OwnableValidator: 'EOAWallet',
			WebAuthnValidator: 'Passkey',
			Simple7702Account: 'EOAWallet',
		} as const
		selectSigner(signerTypeMap[selectedValidationType.value])
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

	// Check if the required signer is connected
	switch (selectedValidationType.value) {
		case 'ECDSAValidator':
		case 'OwnableValidator':
		case 'Simple7702Account':
			return isEOAWalletConnected.value
		case 'WebAuthnValidator':
			return isLogin.value && isFullCredential.value
		default:
			return false
	}
})

const deployment = ref<Deployment | null>(null)
const isDeployed = ref(false)

const computedAddress = computed(() => {
	return deployment.value?.accountAddress
})

const initCode = computed(() => {
	if (!deployment.value) return null
	return concat([deployment.value.factory, deployment.value.factoryData])
})

const isImported = computed(() => {
	return deployment.value && isAccountImported(deployment.value.accountAddress, selectedChainId.value)
})

const errMsg = ref<string | null>(null)

watchImmediate([isValidationAvailable, selectedValidation, isLogin, selectedAccountType, computedSalt], async () => {
	deployment.value = null
	isDeployed.value = false
	errMsg.value = null

	if (isValidationAvailable.value && selectedValidation.value && selectedAccountType.value && computedSalt.value) {
		isComputingAddress.value = true
		try {
			deployment.value = await getDeployment(
				client.value,
				selectedAccountType.value,
				selectedValidation.value,
				computedSalt.value,
			)
			const { getCode, isDeployed: isAccountDeployed } = useGetCode()
			await getCode(deployment.value.accountAddress)
			isDeployed.value = isAccountDeployed.value
		} catch (error) {
			throw error
		} finally {
			isComputingAddress.value = false
		}
	} else if (!selectedValidation.value) {
		if (selectedValidationType.value === 'WebAuthnValidator' && isLogin.value && !isFullCredential.value) {
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
				vMethods: [serializeValidationMethod(selectedValidation.value)],
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
			vMethods: [serializeValidationMethod(selectedValidation.value)],
		},
		initCode.value,
	)

	selectAccount(computedAddress.value, selectedChainId.value)

	useTxModal().openModal({
		// Update the deployed status when the transaction status changes
		// When users has deployed and closed the modal, they can't click the deploy button again
		onSuccess: async () => {
			if (!computedAddress.value) {
				throw new Error('[onClickDeploy] computedAddress is falsy')
			}
			const { getCode, isDeployed: isAccountDeployed } = useGetCode()
			await getCode(computedAddress.value)
			isDeployed.value = isAccountDeployed.value
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
										? VALIDATION_METHOD_DISPLAY[selectedValidationType].name
										: 'Select Validation Type'
								}}
							</div>
						</SelectValue>
					</SelectTrigger>

					<SelectContent>
						<SelectItem
							v-for="vMethod in supportedValidationMethods"
							:key="vMethod.type"
							:value="vMethod.type"
							class="cursor-pointer"
						>
							<div class="flex flex-col py-1">
								<div class="flex items-center justify-between w-full gap-2">
									<div class="font-medium">{{ vMethod.name }}</div>
								</div>
								<div class="text-xs text-muted-foreground mt-0.5">
									{{ vMethod.description }}
								</div>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>

				<!-- Signer connection -->
				<div
					v-if="
						selectedValidationType === 'ECDSAValidator' ||
						selectedValidationType === 'OwnableValidator' ||
						selectedValidationType === 'Simple7702Account'
					"
				>
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

				<div v-if="selectedValidationType === 'WebAuthnValidator'">
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
