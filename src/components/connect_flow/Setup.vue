<script setup lang="ts">
import { CHARITY_PAYMASTER, ECDSA_VALIDATOR, RPC_URL, SALT } from '@/config'
import { PimlicoBundler } from '@/core/bundler'
import { OpBuilder } from '@/core/op_builders'
import { MyPaymaster } from '@/core/pm_builders'
import { useApp } from '@/stores/app'
import { Path, useConnectFlow } from '@/stores/connect_flow2'
import { useEthers } from '@/stores/ethers'
import { shortenAddress } from '@vue-dapp/core'
import { hexlify, JsonRpcProvider } from 'ethers'
import { Loader2 } from 'lucide-vue-next'
import { ECDSAValidator, Kernel, MyAccount, sendop } from 'sendop'

const { currentPath } = useConnectFlow()

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
	const { createPathData } = useConnectFlow()
	if (!createPathData.value.connectedAddress) {
		throw new Error('No connected address')
	}

	if (vendor === 'kernel') {
		const kernel = new Kernel(RPC_URL, {
			salt: hexlify(SALT),
			validatorAddress: ECDSA_VALIDATOR,
			owner: createPathData.value.connectedAddress,
		})
		return kernel.getAddress()
	} else if (vendor === 'myaccount') {
		const vendor = new MyAccount(RPC_URL, {
			salt: hexlify(SALT),
			validatorAddress: ECDSA_VALIDATOR,
			owner: createPathData.value.connectedAddress,
		})
		return vendor.getAddress()
	}

	throw new Error('Invalid vendor')
}

const loadingDeploy = ref(false)
async function handleDeploy() {
	const { createPathData, goNext } = useConnectFlow()
	if (!createPathData.value.connectedAddress) {
		throw new Error('No connected address')
	}

	let vendor

	if (selectedVendor.value === 'kernel') {
		vendor = new Kernel(RPC_URL, {
			salt: hexlify(SALT),
			validatorAddress: ECDSA_VALIDATOR,
			owner: createPathData.value.connectedAddress,
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
		// account address, vendor, validator, chainId
		goNext()
	} catch (err) {
		console.error(err)
	} finally {
		loadingDeploy.value = false
	}
}
</script>

<template>
	<div>
		<div v-if="currentPath === Path.CREATE" class="flex flex-col gap-4">
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
				<Button class="w-full" @click="handleDeploy" :disabled="!deployedAddress || loadingDeploy">
					<Loader2 v-if="loadingDeploy" class="w-4 h-4 mr-2 animate-spin" />
					Deploy
				</Button>
			</div>
		</div>
	</div>
</template>
