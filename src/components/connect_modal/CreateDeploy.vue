<script setup lang="ts">
import { ECDSA_VALIDATOR, RPC_URL, SALT } from '@/config'
import { useApp } from '@/stores/app'
import { useEthers } from '@/stores/ethers'
import { ConnectModalStageKey, useConnectModal } from '@/stores/useConnectModal'
import { AccountId } from '@/types'
import { shortenAddress } from '@vue-dapp/core'
import { hexlify } from 'ethers'
import { Loader2 } from 'lucide-vue-next'
import { ECDSAValidator, ERC4337Account, Kernel, MyAccount } from 'sendop'

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

function getDeployedAddress(accountId: AccountId) {
	if (!store.value.eoaAddress) {
		throw new Error('No connected address')
	}

	const { client } = useApp()

	if (accountId === AccountId.KERNEL) {
		return Kernel.getNewAddress(client.value, {
			salt: hexlify(SALT),
			validatorAddress: ECDSA_VALIDATOR,
			owner: store.value.eoaAddress,
		})
	} else if (accountId === AccountId.MY_ACCOUNT) {
		const myAccount = new MyAccount(RPC_URL, {
			salt: hexlify(SALT),
			validatorAddress: ECDSA_VALIDATOR,
			owner: store.value.eoaAddress,
		})
		return myAccount.getAddress()
	}

	throw new Error('Invalid accountId')
}

const loadingDeploy = ref(false)
const errorDeploy = ref<string | null>(null)

async function onClickDeploy() {
	if (!store.value.eoaAddress) {
		throw new Error('No connected address')
	}
	if (!deployedAddress.value) {
		throw new Error('No deployed address')
	}
	const { signer } = useEthers()
	if (!signer.value) {
		throw new Error('No signer')
	}

	const { bundler, client, rpcUrl, pmBuilder } = useApp()

	let accountVendor: ERC4337Account

	if (selectedVendor.value === AccountId.KERNEL) {
		accountVendor = new Kernel({
			client: client.value,
			bundler: bundler.value,
			validator: new ECDSAValidator({
				address: ECDSA_VALIDATOR,
				clientUrl: rpcUrl.value,
				signer: signer.value,
			}),
			pmBuilder: pmBuilder.value,
			creationOptions: {
				salt: hexlify(SALT),
				validatorAddress: ECDSA_VALIDATOR,
				owner: store.value.eoaAddress,
			},
		})
	} else if (selectedVendor.value === AccountId.MY_ACCOUNT) {
		throw new Error('MyAccount not supported')
		// vendor = new MyAccount(RPC_URL, {
		// 	salt: hexlify(SALT),
		// 	validatorAddress: ECDSA_VALIDATOR,
		// 	owner: store.value.eoaAddress,
		// })
	} else {
		throw new Error('Invalid vendor')
	}

	loadingDeploy.value = true
	try {
		const op = await accountVendor.deploy()

		const receipt = await op.wait()
		console.log(receipt)

		const { updateStore } = useConnectModal()
		updateStore({
			deployedAddress: deployedAddress.value,
			accountId: selectedVendor.value,
		})

		goNextStage()
	} catch (err: unknown) {
		const errorMessage = (err as Error).toString().match(/AA\d+[^:]+/)?.[0] || 'Error deploying'
		errorDeploy.value = errorMessage
		console.error(err)
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
