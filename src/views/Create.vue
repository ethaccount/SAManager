<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { SALT } from '@/config'
import { AccountId, ACCOUNT_ID_TO_NAME, SUPPORTED_ACCOUNTS } from '@/lib/account'

// Filter only modular accounts as they're the only ones that can be created
const accountTypes = Object.entries(SUPPORTED_ACCOUNTS)
	.filter(([_, data]) => !data.onlySmartEOA)
	.map(([id]) => ({
		id: id as AccountId,
		name: ACCOUNT_ID_TO_NAME[id as AccountId],
		description: `Supports EntryPoint ${SUPPORTED_ACCOUNTS[id as AccountId].entryPointVersion}`,
	}))

const selectedAccountType = ref<AccountId>(accountTypes[0].id)
const shouldDeploy = ref(false)
const computedAddress = ref<string>('')

// Form fields
const kernelForm = ref({
	validatorAddress: '',
	validatorInitData: '',
})

const nexusForm = ref({
	validatorAddress: '',
	validatorInitData: '',
	registryAddress: '',
	threshold: 1,
})

const safeForm = ref({
	validatorAddress: '',
	owners: '',
	ownersThreshold: 1,
	attestersThreshold: 1,
})

const isValidForm = computed(() => {
	switch (selectedAccountType.value) {
		case AccountId['kernel.advanced.v0.3.1']:
			return kernelForm.value.validatorAddress && kernelForm.value.validatorInitData
		case AccountId['biconomy.nexus.1.0.2']:
			return (
				nexusForm.value.validatorAddress && nexusForm.value.validatorInitData && nexusForm.value.registryAddress
			)
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return safeForm.value.validatorAddress && safeForm.value.owners
		default:
			return false
	}
})

const onClickReview = () => {
	// This will be implemented later to compute and show the address
	computedAddress.value = '0x...'
}
</script>

<template>
	<CenterStageLayout>
		<Card class="w-full bg-background/50 backdrop-blur-sm border-none shadow-none">
			<CardContent class="pt-6">
				<div class="mb-6">
					<Select v-model="selectedAccountType">
						<SelectTrigger
							class="w-full bg-muted/30 border-border/50 hover:border-primary transition-colors"
						>
							<SelectValue placeholder="Select Account Type">
								<div class="flex items-center justify-between w-full">
									<span class="font-medium">{{ ACCOUNT_ID_TO_NAME[selectedAccountType] }}</span>
									<span class="text-xs text-muted-foreground rounded-full bg-muted px-2.5 py-0.5">
										EntryPoint {{ SUPPORTED_ACCOUNTS[selectedAccountType].entryPointVersion }}
									</span>
								</div>
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem
								v-for="type in accountTypes"
								:key="type.id"
								:value="type.id"
								class="cursor-pointer"
							>
								<div class="flex flex-col py-1">
									<div class="flex items-center justify-between w-full">
										<span class="font-medium">{{ type.name }}</span>
										<span class="text-xs text-muted-foreground rounded-full bg-muted px-2.5 py-0.5">
											EntryPoint {{ SUPPORTED_ACCOUNTS[type.id].entryPointVersion }}
										</span>
									</div>
									<span class="text-xs text-muted-foreground mt-0.5">{{ type.id }}</span>
								</div>
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div class="space-y-4">
					<!-- Kernel Form -->
					<div v-if="selectedAccountType === AccountId['kernel.advanced.v0.3.1']" class="space-y-3">
						<Input
							v-model="kernelForm.validatorAddress"
							placeholder="Validator Address (0x...)"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>
						<Input
							v-model="kernelForm.validatorInitData"
							placeholder="Validator Init Data"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>
					</div>

					<!-- Nexus Form -->
					<div v-if="selectedAccountType === AccountId['biconomy.nexus.1.0.2']" class="space-y-3">
						<Input
							v-model="nexusForm.validatorAddress"
							placeholder="Validator Address (0x...)"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>
						<Input
							v-model="nexusForm.validatorInitData"
							placeholder="Validator Init Data"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>
						<Input
							v-model="nexusForm.registryAddress"
							placeholder="Registry Address (0x...)"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>
						<Input
							v-model="nexusForm.threshold"
							type="number"
							placeholder="Threshold"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>
					</div>

					<!-- Safe Form -->
					<div v-if="selectedAccountType === AccountId['rhinestone.safe7579.v1.0.0']" class="space-y-3">
						<Input
							v-model="safeForm.validatorAddress"
							placeholder="Validator Address (0x...)"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>
						<Input
							v-model="safeForm.owners"
							placeholder="Owners (comma separated addresses)"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>
						<Input
							v-model="safeForm.ownersThreshold"
							type="number"
							placeholder="Owners Threshold"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>
						<Input
							v-model="safeForm.attestersThreshold"
							type="number"
							placeholder="Attesters Threshold"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>
					</div>

					<div class="flex items-center space-x-2 py-4">
						<Switch id="deploy" v-model="shouldDeploy" />
						<Label for="deploy">Deploy Contract</Label>
					</div>

					<div v-if="computedAddress" class="p-4 rounded-lg bg-muted/30 font-mono text-sm">
						Computed Address: {{ computedAddress }}
					</div>
				</div>

				<div class="mt-6">
					<Button
						class="w-full bg-primary/90 hover:bg-primary disabled:opacity-50"
						size="lg"
						@click="onClickReview"
						:disabled="!isValidForm"
					>
						Review
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
