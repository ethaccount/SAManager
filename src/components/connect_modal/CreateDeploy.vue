<script setup lang="ts">
import { CHARITY_PAYMASTER, ECDSA_VALIDATOR, RPC_URL, SALT } from '@/config'
import { PimlicoBundler } from '@/core/bundler'
import { OpBuilder } from '@/core/op_builders'
import { MyPaymaster } from '@/core/pm_builders'
import { useApp } from '@/stores/app'
import { useConnectModal, ConnectFlowState } from '@/stores/connect_modal'
import { useEthers } from '@/stores/ethers'
import { shortenAddress } from '@vue-dapp/core'
import { hexlify, JsonRpcProvider } from 'ethers'
import { Loader2 } from 'lucide-vue-next'
import { ECDSAValidator, Kernel, MyAccount, sendop } from 'sendop'
import { useAccount, ConnectedAccount } from '@/stores/account'

const { assertState, goNextState, store } = useConnectModal()
assertState(ConnectFlowState.CREATE_DEPLOY)

const selectedVendor = ref<'kernel' | 'myaccount' | undefined>(undefined)
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

function getDeployedAddress(vendor: 'kernel' | 'myaccount') {
	if (!store.value.eoaAddress) {
		throw new Error('No connected address')
	}

	if (vendor === 'kernel') {
		const kernel = new Kernel(RPC_URL, {
			salt: hexlify(SALT),
			validatorAddress: ECDSA_VALIDATOR,
			owner: store.value.eoaAddress,
		})
		return kernel.getAddress()
	} else if (vendor === 'myaccount') {
		const vendor = new MyAccount(RPC_URL, {
			salt: hexlify(SALT),
			validatorAddress: ECDSA_VALIDATOR,
			owner: store.value.eoaAddress,
		})
		return vendor.getAddress()
	}

	throw new Error('Invalid vendor')
}

const loadingDeploy = ref(false)
const errorDeploy = ref<string | null>(null)

async function onClickDeploy() {
	if (!store.value.eoaAddress) {
		throw new Error('No connected address')
	}

	let vendor

	if (selectedVendor.value === 'kernel') {
		vendor = new Kernel(RPC_URL, {
			salt: hexlify(SALT),
			validatorAddress: ECDSA_VALIDATOR,
			owner: store.value.eoaAddress,
		})
	}

	const { chainId, bundlerUrl } = useApp()
	if (!deployedAddress.value) {
		throw new Error('No deployed address')
	}

	const { signer } = useEthers()

	if (!signer.value) {
		throw new Error('No signer')
	}

	loadingDeploy.value = true
	try {
		const accountData: ConnectedAccount = {
			address: deployedAddress.value,
			chainId: chainId.value,
			vendor: 'kernel',
			validator: store.value.validator!,
		}
		console.log('sendop to deploy', accountData)

		const op = await sendop({
			bundler: new PimlicoBundler(chainId.value, bundlerUrl.value),
			from: deployedAddress.value,
			executions: [],
			opBuilder: new OpBuilder({
				client: new JsonRpcProvider(RPC_URL),
				vendor,
				validator: new ECDSAValidator({
					address: ECDSA_VALIDATOR,
					clientUrl: RPC_URL,
					signer: signer.value,
				}),
				from: deployedAddress.value,
				isCreation: true,
			}),
			pmBuilder: new MyPaymaster({
				chainId: chainId.value,
				clientUrl: RPC_URL,
				paymasterAddress: CHARITY_PAYMASTER,
			}),
		})

		const receipt = await op.wait()
		console.log(receipt)

		// store account data to app as AA connected
		const { account } = useAccount()
		account.value = accountData

		goNextState()
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
						<RadioGroupItem id="kernel" value="kernel" class="peer sr-only" />
						<Label
							for="kernel"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
						>
							Kernel
						</Label>
					</div>
					<div>
						<RadioGroupItem id="myaccount" value="myaccount" class="peer sr-only" />
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
