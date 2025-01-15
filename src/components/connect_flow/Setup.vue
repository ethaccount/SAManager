<script setup lang="ts">
import { RPC_URL, SALT, ECDSA_VALIDATOR } from '@/config'
import { useConnectFlow, Path } from '@/stores/connect_flow2'
import { shortenAddress } from '@vue-dapp/core'
import { hexlify } from 'ethers'
import { Kernel, MyAccount } from 'sendop'

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
		</div>
	</div>
</template>
