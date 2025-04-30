<script setup lang="ts">
import { SALT } from '@/config'
import { signMessage } from '@/lib/passkey'
import { useNetwork } from '@/stores/useNetwork'
import { ConnectModalStageKey, useConnectModal } from '@/stores/useConnectModal'
import { useEOA } from '@/stores/useEOA'
import { usePasskey } from '@/stores/usePasskey'
import { AccountId } from '@/types'
import { shortenAddress } from '@vue-dapp/core'
import { hexlify } from 'ethers'
import { Loader2 } from 'lucide-vue-next'
import {
	ADDRESS,
	BICONOMY_ATTESTER_ADDRESS,
	EOAValidatorModule,
	ERC7579Validator,
	KernelCreationOptions,
	KernelV3Account,
	NexusAccount,
	NexusCreationOptions,
	RHINESTONE_ATTESTER_ADDRESS,
	SmartAccount,
	WebAuthnValidatorModule,
	DEV_ATTESTER_ADDRESS,
	ModularSmartAccount,
} from 'sendop'

const { assertStage, goNextStage, store } = useConnectModal()
assertStage(ConnectModalStageKey.CREATE_DEPLOY)

const selectedVendor = ref<AccountId | undefined>(undefined)
const computedAddress = ref<string | null>(null)
const loadingDeployedAddress = ref(false)

// Watch for changes in selectedVendor and update computedAddress
watch(selectedVendor, async newVendor => {
	if (newVendor !== undefined) {
		try {
			loadingDeployedAddress.value = true
			const _address = await getComputedAddress(newVendor)
			if (!_address) {
				throw new Error('address not found')
			}
			computedAddress.value = _address
		} catch (error) {
			console.error('Error getting deployed address:', error)
			computedAddress.value = null
		} finally {
			loadingDeployedAddress.value = false
		}
	} else {
		computedAddress.value = null
	}
})

const creationOptions = ref<KernelCreationOptions | NexusCreationOptions | null>(null)

function getComputedAddress(accountId: AccountId) {
	const { client } = useNetwork()

	creationOptions.value = {
		salt: hexlify(SALT),
		validatorAddress: '0x',
		validatorInitData: '0x',
		bootstrap: 'initNexusWithSingleValidator',
		registryAddress: ADDRESS.Registry,
		attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS, DEV_ATTESTER_ADDRESS],
		threshold: 1,
	}

	switch (store.value.validator) {
		case 'eoa':
			if (!store.value.eoaAddress) {
				throw new Error('No connected address')
			}

			creationOptions.value.validatorAddress = ADDRESS.ECDSAValidator
			creationOptions.value.validatorInitData = store.value.eoaAddress
			switch (accountId) {
				case AccountId.KERNEL:
					return KernelV3Account.computeAccountAddress(client.value, creationOptions.value)
				case AccountId.NEXUS:
					return NexusAccount.computeAccountAddress(client.value, creationOptions.value)
				default:
					return null
			}
		case 'passkey':
			const { credential } = usePasskey()
			if (!credential.value) {
				throw new Error('No passkey credential')
			}

			creationOptions.value.validatorAddress = ADDRESS.WebAuthnValidator
			creationOptions.value.validatorInitData = WebAuthnValidatorModule.getInitData({
				pubKeyX: credential.value.pubX,
				pubKeyY: credential.value.pubY,
				authenticatorIdHash: credential.value.authenticatorIdHash,
			})

			switch (accountId) {
				case AccountId.KERNEL:
					return KernelV3Account.computeAccountAddress(client.value, creationOptions.value)
				case AccountId.NEXUS:
					return NexusAccount.computeAccountAddress(client.value, creationOptions.value)
				default:
					return null
			}
	}

	return null
}

const loadingDeploy = ref(false)
const errorDeploy = ref<string | null>(null)

async function onClickDeploy() {
	if (!creationOptions.value) {
		throw new Error('No creation options')
	}

	if (!computedAddress.value) {
		throw new Error('No deployed address')
	}

	const { bundler, client, pmGetter } = useNetwork()

	let erc7579Validator: ERC7579Validator

	switch (store.value.validator) {
		case 'eoa':
			const { signer } = useEOA()
			if (!signer.value) {
				throw new Error('No signer')
			}
			erc7579Validator = new EOAValidatorModule({
				address: ADDRESS.ECDSAValidator,
				signer: signer.value,
			})
			break
		case 'passkey':
			erc7579Validator = new WebAuthnValidatorModule({
				address: ADDRESS.WebAuthnValidator,
				signMessage: signMessage,
			})
			break
		default:
			throw new Error('Invalid validator')
	}

	let smartAccount: ModularSmartAccount<KernelCreationOptions | NexusCreationOptions>

	switch (selectedVendor.value) {
		case AccountId.KERNEL:
			smartAccount = new KernelV3Account({
				address: computedAddress.value,
				client: client.value,
				bundler: bundler.value,
				validator: erc7579Validator,
				pmGetter: pmGetter.value,
			})
			break
		case AccountId.NEXUS:
			smartAccount = new NexusAccount({
				address: computedAddress.value,
				client: client.value,
				bundler: bundler.value,
				validator: erc7579Validator,
				pmGetter: pmGetter.value,
			})
			break
		default:
			throw new Error('Invalid vendor')
	}

	try {
		loadingDeploy.value = true

		console.log('creationOptions', creationOptions.value)
		const op = await smartAccount.deploy(creationOptions.value)

		const receipt = await op.wait()
		console.log(receipt)

		const { updateStore } = useConnectModal()
		updateStore({
			deployedAddress: computedAddress.value,
			accountId: selectedVendor.value,
		})

		goNextStage()
	} catch (err: unknown) {
		throw err
	} finally {
		loadingDeploy.value = false
	}
}
</script>

<template>
	<div>
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-4">
				<h3 class="text-lg font-semibold">Select Account Type</h3>

				<RadioGroup v-model="selectedVendor" class="grid grid-cols-2 gap-4">
					<div>
						<RadioGroupItem id="Kernel" :value="AccountId.KERNEL" class="peer sr-only" />
						<Label
							for="Kernel"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary hover:cursor-pointer"
						>
							Kernel
						</Label>
					</div>
					<div>
						<RadioGroupItem id="Nexus" :value="AccountId.NEXUS" class="peer sr-only" />
						<Label
							for="Nexus"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary hover:cursor-pointer"
						>
							Nexus
						</Label>
					</div>
				</RadioGroup>
			</div>

			<div>
				<h3 class="text-lg font-semibold">Deployed Address</h3>
				<p class="text-sm text-muted-foreground">
					{{
						loadingDeployedAddress
							? 'Loading...'
							: computedAddress
							? shortenAddress(computedAddress)
							: 'None'
					}}
				</p>
			</div>

			<div>
				<Button class="w-full" @click="onClickDeploy" :disabled="!computedAddress || loadingDeploy">
					<Loader2 v-if="loadingDeploy" class="w-4 h-4 mr-2 animate-spin" />
					Deploy
				</Button>
			</div>

			<div v-if="errorDeploy" class="text-destructive text-sm">
				{{ errorDeploy }}
			</div>
		</div>
	</div>
</template>
