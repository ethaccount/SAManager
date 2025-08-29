<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
	ACCOUNT_SUPPORTED_INITIAL_VALIDATION,
	AccountId,
	AccountRegistry,
	Deployment,
	getDeployment,
} from '@/lib/accounts'
import { toRoute } from '@/lib/router'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { useGetCode } from '@/lib/useGetCode'
import {
	ECDSAValidatorVMethod,
	OwnableValidatorVMethod,
	ValidationMethod,
	ValidationMethodName,
	ValidationType,
	WebAuthnValidatorVMethod,
} from '@/lib/validations'
import { useAccounts } from '@/stores/account/useAccounts'
import { displayChainName } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/useSigner'
import { useTxModal } from '@/stores/useTxModal'
import { concat, getBigInt, hexlify, isAddress } from 'ethers'
import { AlertCircle, ChevronRight, Power } from 'lucide-vue-next'
import { toBytes32 } from 'sendop'

const router = useRouter()
const { client, selectedChainId } = useBlockchain()
const { wallet, address, disconnect, isEOAWalletConnected, isEOAWalletSupported, signer } = useEOAWallet()
const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
const {
	selectedCredentialDisplay,
	isLogin,
	resetCredentialId,
	isFullCredential,
	selectedCredential,
	isPasskeySupported,
} = usePasskey()
const { importAccount, selectAccount, isAccountImported } = useAccounts()
const { selectedSigner } = useSigner()

const supportedAccounts = AccountRegistry.getSupportedAccountsForCreation()

const selectedAccountType = ref<AccountId | undefined>(undefined) // use undefined instead of null for v-model
const selectedValidationType = ref<ValidationType | undefined>(undefined) // use undefined instead of null for v-model

const supportedValidations = computed<
	{
		type: ValidationType
		name: ValidationMethodName
	}[]
>(() => {
	if (!selectedAccountType.value) return []
	return ACCOUNT_SUPPORTED_INITIAL_VALIDATION[selectedAccountType.value] || []
})

const isComputingAddress = ref(false)
const showMoreOptions = ref(false)

// Reset validation type when account type is changed
watch(selectedAccountType, () => {
	// if the supported validations only has one type, select it
	if (supportedValidations.value && supportedValidations.value.length === 1) {
		selectedValidationType.value = supportedValidations.value[0].type
	} else {
		selectedValidationType.value = undefined
	}
})

const selectedValidationMethod = computed<ValidationMethod | null>(() => {
	// Return null instead of throwing error in this computed property
	if (!selectedAccountType.value) return null
	if (!selectedValidationType.value) return null

	switch (selectedValidationType.value) {
		case 'EOA-Owned': {
			if (!signer.value) return null
			const signerAddress = signer.value.address

			// get account supported validation method name
			const validationMethodName = ACCOUNT_SUPPORTED_INITIAL_VALIDATION[selectedAccountType.value]?.find(
				v => v.type === selectedValidationType.value,
			)?.name
			if (!validationMethodName) return null

			switch (validationMethodName) {
				case 'ECDSAValidator':
					return new ECDSAValidatorVMethod(signerAddress)
				case 'OwnableValidator':
					return new OwnableValidatorVMethod({
						addresses: [signerAddress],
						threshold: 1,
					})
				default:
					return null
			}
		}
		case 'PASSKEY': {
			if (!selectedCredential.value) return null
			const credential = selectedCredential.value
			return new WebAuthnValidatorVMethod(
				getAuthenticatorIdHash(credential.credentialId),
				getBigInt(hexlify(credential.pubKeyX)),
				getBigInt(hexlify(credential.pubKeyY)),
				credential.username,
			)
		}
		default:
			return null
	}
})

// Auto select the signer when the selectedValidationMethod is updated
watchImmediate(selectedValidationMethod, () => {
	if (selectedValidationMethod.value) {
		const { selectSigner } = useSigner()
		selectSigner(selectedValidationMethod.value.signerType)
	}
})

const saltInput = ref<number | undefined>(undefined)
const computedSalt = computed(() => {
	if (!saltInput.value) return APP_SALT
	return toBytes32(BigInt(saltInput.value))
})

// Check if the signer is connected and corresponding to the selected validation type
const isValidationAvailable = computed(() => {
	if (!selectedValidationMethod.value) return false
	if (!selectedSigner.value) return false
	return selectedValidationMethod.value.isValidSigner(selectedSigner.value)
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

// when these states are changed, we need to re-compute the deployment
watchImmediate(
	[isValidationAvailable, selectedValidationType, isLogin, selectedAccountType, computedSalt],
	async () => {
		deployment.value = null
		isDeployed.value = false
		errMsg.value = null

		if (
			isValidationAvailable.value &&
			selectedValidationMethod.value &&
			selectedAccountType.value &&
			computedSalt.value
		) {
			isComputingAddress.value = true
			try {
				deployment.value = await getDeployment(
					client.value,
					selectedAccountType.value,
					selectedValidationMethod.value,
					computedSalt.value,
				)
				console.log('deployment', deployment.value)
				const { getCode, isDeployed: isAccountDeployed } = useGetCode()
				await getCode(deployment.value.accountAddress)
				isDeployed.value = isAccountDeployed.value
			} catch (error) {
				throw error
			} finally {
				isComputingAddress.value = false
			}
		} else {
			if (selectedValidationType.value === 'PASSKEY' && isLogin.value && !isFullCredential.value) {
				errMsg.value = `This passkey's public key is not stored in the browser,
					so it can only be used for signing but not for creating a new account.
					To use a passkey with a public key, please create a new one.`
			}
		}
	},
)

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

	if (!selectedValidationMethod.value) {
		throw new Error('onClickImport: No validation')
	}

	if (!isImported.value) {
		importAccount(
			{
				accountId: selectedAccountType.value,
				category: 'Smart Account',
				address: computedAddress.value,
				chainId: selectedChainId.value,
				vMethods: [selectedValidationMethod.value.serialize()],
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

	if (!selectedValidationMethod.value) {
		throw new Error('onClickDeploy: No validation')
	}

	console.log('initCode', initCode.value)

	importAccount(
		{
			accountId: selectedAccountType.value,
			category: 'Smart Account',
			address: computedAddress.value,
			chainId: selectedChainId.value,
			vMethods: [selectedValidationMethod.value.serialize()],
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
	return !computedAddress.value || !initCode.value || !selectedValidationMethod.value || isDeployed.value
})

const disabledImportButton = computed(() => {
	return !computedAddress.value || !initCode.value || !selectedValidationMethod.value
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
						{{ isImported ? 'Account Info' : 'Import' }}
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
