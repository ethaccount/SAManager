<script setup lang="ts">
import { useConnectFlowStore, ConnectStage } from '@/stores/connect_flow'

const { setWalletConnectionData, selectedPath, isWalletDataValid, stageData } = useConnectFlowStore()
const { currentWalletConfig } = storeToRefs(useConnectFlowStore())

const showValidatorSelection = computed(() => currentWalletConfig.value?.requiresValidator)

const showVendorSelection = computed(() => currentWalletConfig.value?.requiresVendor)

const showAccountSelection = computed(() => currentWalletConfig.value?.requiresAccountSelection)

function handleConnect() {
	console.log('handleConnect')
}
</script>

<template>
	<Card>
		<CardHeader>
			<CardTitle>Connect Wallet</CardTitle>
			<CardDescription>
				{{
					selectedPath === ConnectStage.CREATE ? 'Configure your new wallet' : 'Connect your existing wallet'
				}}
			</CardDescription>
		</CardHeader>

		<CardContent>
			<!-- Vendor Selection -->
			<div v-if="showVendorSelection" class="mb-4">
				<Label>Select Wallet Vendor</Label>
				<RadioGroup
					:value="stageData.walletConnection.vendor"
					@update:value="vendor => setWalletConnectionData({ vendor })"
				>
					<div class="flex items-center space-x-2">
						<RadioGroupItem value="metamask" />
						<Label>MetaMask</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroupItem value="coinbase" />
						<Label>Coinbase Wallet</Label>
					</div>
				</RadioGroup>
			</div>

			<!-- Validator Selection (Create path only) -->
			<div v-if="showValidatorSelection" class="mb-4">
				<Label>Select Validator</Label>
				<RadioGroup
					:value="stageData.walletConnection.validator"
					@update:value="validator => setWalletConnectionData({ validator })"
				>
					<div class="flex items-center space-x-2">
						<RadioGroupItem value="validator1" />
						<Label>Validator 1</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroupItem value="validator2" />
						<Label>Validator 2</Label>
					</div>
				</RadioGroup>
			</div>

			<!-- Account Selection (EOA Managed path only) -->
			<div v-if="showAccountSelection" class="mb-4">
				<Label>Select Account</Label>
				<select
					:value="stageData.walletConnection.selectedAccount"
					@change="
						e =>
							setWalletConnectionData({
								selectedAccount: e.target.value,
							})
					"
				>
					<option value="">Select an account</option>
					<!-- Populate with actual accounts -->
				</select>
			</div>

			<!-- Connect Button -->
			<Button :disabled="!isWalletDataValid" @click="handleConnect"> Connect Wallet </Button>
		</CardContent>
	</Card>
</template>
