<script setup lang="ts">
import { SALT } from '@/config'
import { useEOA } from '@/stores/useEOA'
import { useBlockchain } from '@/stores/useBlockchain'
import { ConnectModalStageKey, useConnectModal } from '@/stores/useConnectModal'
import { AccountId } from '@/types'
import { shortenAddress } from '@vue-dapp/core'
import { hexlify } from 'ethers'
import { Loader2 } from 'lucide-vue-next'
import {
	ECDSA_VALIDATOR_ADDRESS,
	WEB_AUTHN_VALIDATOR_ADDRESS,
	ECDSAValidator,
	ERC7579Validator,
	Kernel,
	KernelCreationOptions,
	MyAccount,
	SmartAccount,
	WebAuthnValidator,
} from 'sendop'
import { usePasskey } from '@/stores/usePasskey'
import { signMessage } from '@/lib/passkey'

const { assertStage, goNextStage, store } = useConnectModal()
assertStage(ConnectModalStageKey.CREATE_DEPLOY)

const selectedVendor = ref<AccountId | undefined>(undefined)
const deployedAddress = ref<string | null>(null)
const loadingDeployedAddress = ref(false)

// Watch for changes in selectedVendor and update deployedAddress
watch(selectedVendor, async newVendor => {
	if (newVendor !== undefined) {
		try {
			loadingDeployedAddress.value = true
			deployedAddress.value = await getDeployedAddress(newVendor)
		} catch (error) {
			console.error('Error getting deployed address:', error)
			deployedAddress.value = null
		} finally {
			loadingDeployedAddress.value = false
		}
	} else {
		deployedAddress.value = null
	}
})

const creationOptions = ref<KernelCreationOptions | null>(null)

function getDeployedAddress(accountId: AccountId) {
	const { client } = useBlockchain()

	creationOptions.value = {
		salt: hexlify(SALT),
		validatorAddress: '0x',
		initData: '0x',
	}

	switch (store.value.validator) {
		case 'eoa':
			if (!store.value.eoaAddress) {
				throw new Error('No connected address')
			}

			creationOptions.value.validatorAddress = ECDSA_VALIDATOR_ADDRESS
			creationOptions.value.initData = store.value.eoaAddress
			switch (accountId) {
				case AccountId.KERNEL:
					return Kernel.getNewAddress(client.value, creationOptions.value)
				case AccountId.MY_ACCOUNT:
					// REMOVE
					return MyAccount.getNewAddress(client.value, {
						salt: hexlify(SALT),
						validatorAddress: ECDSA_VALIDATOR_ADDRESS,
						owner: store.value.eoaAddress,
					})
				default:
					return null
			}
		case 'passkey':
			const { credential } = usePasskey()
			if (!credential.value) {
				throw new Error('No passkey credential')
			}

			creationOptions.value.validatorAddress = WEB_AUTHN_VALIDATOR_ADDRESS
			creationOptions.value.initData = WebAuthnValidator.getInitData({
				pubKeyX: credential.value.pubX,
				pubKeyY: credential.value.pubY,
				authenticatorIdHash: credential.value.authenticatorIdHash,
			})

			switch (accountId) {
				case AccountId.KERNEL:
					return Kernel.getNewAddress(client.value, creationOptions.value)
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

	if (!deployedAddress.value) {
		throw new Error('No deployed address')
	}

	const { bundler, client, pmGetter } = useBlockchain()

	let erc7579Validator: ERC7579Validator

	switch (store.value.validator) {
		case 'eoa':
			const { signer } = useEOA()
			if (!signer.value) {
				throw new Error('No signer')
			}
			erc7579Validator = new ECDSAValidator({
				address: ECDSA_VALIDATOR_ADDRESS,
				client: client.value,
				signer: signer.value,
			})
			break
		case 'passkey':
			erc7579Validator = new WebAuthnValidator({
				address: WEB_AUTHN_VALIDATOR_ADDRESS,
				signMessage: signMessage,
			})
			break
		default:
			throw new Error('Invalid validator')
	}

	let smartAccount: SmartAccount

	switch (selectedVendor.value) {
		case AccountId.KERNEL:
			smartAccount = new Kernel(deployedAddress.value, {
				client: client.value,
				bundler: bundler.value,
				erc7579Validator,
				pmGetter: pmGetter.value,
			})
			break
		case AccountId.MY_ACCOUNT:
			smartAccount = new MyAccount(deployedAddress.value, {
				client: client.value,
				bundler: bundler.value,
				erc7579Validator,
				pmGetter: pmGetter.value,
			})
			break
		default:
			throw new Error('Invalid vendor')
	}

	try {
		loadingDeploy.value = true

		const op = await smartAccount.deploy(creationOptions.value)

		const receipt = await op.wait()
		console.log(receipt)

		const { updateStore } = useConnectModal()
		updateStore({
			deployedAddress: deployedAddress.value,
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
						<RadioGroupItem id="kernel" :value="AccountId.KERNEL" class="peer sr-only" />
						<Label
							for="kernel"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
						>
							Kernel
						</Label>
					</div>
					<div>
						<RadioGroupItem id="myaccount" :value="AccountId.MY_ACCOUNT" class="peer sr-only" />
						<Label
							for="myaccount"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
						>
							MyAccount
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
							: deployedAddress
							? shortenAddress(deployedAddress)
							: 'None'
					}}
				</p>
			</div>

			<div>
				<Button class="w-full" @click="onClickDeploy" :disabled="!deployedAddress || loadingDeploy">
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
