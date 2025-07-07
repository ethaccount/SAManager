<script setup lang="ts">
import { ValidationMethodData } from '@/lib/validations/ValidationMethod'
import { displayAccountName, ImportedAccount } from '@/stores/account/account'
import { useAccounts } from '@/stores/account/useAccounts'
import { CHAIN_NAME } from '@/stores/blockchain/blockchain'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useImportAccountModal } from '@/stores/useImportAccountModal'
import { shortenAddress } from '@vue-dapp/core'
import { CheckCircle2 } from 'lucide-vue-next'

const props = defineProps<{
	accountData: () => Omit<ImportedAccount, 'chainId'>
}>()

const { selectedChainId } = useBlockchain()
const { importAccount } = useAccounts()

const isSuccess = ref(false)

const onClickConfirm = () => {
	importAccount({
		address: props.accountData().address,
		accountId: props.accountData().accountId,
		vMethods: props.accountData().vMethods,
		category: props.accountData().category,
		chainId: selectedChainId.value,
	})
	isSuccess.value = true
}

function displayValidationOptions(vMethods: ValidationMethodData[]) {
	return vMethods.map(v => v.name).join(', ')
}
</script>

<template>
	<div class="flex flex-col items-center justify-center p-6 space-y-6">
		<!-- Success Message -->
		<div v-if="isSuccess" class="text-center space-y-2">
			<h3 class="text-xl font-semibold text-foreground">
				{{ 'Successfully Imported' }}
			</h3>
		</div>

		<!-- Success Icon -->
		<div v-if="isSuccess" class="text-green-500">
			<CheckCircle2 class="w-16 h-16" />
		</div>

		<!-- Account Details -->
		<div v-if="!isSuccess" class="w-full max-w-sm space-y-3 bg-muted/30 rounded-lg p-4">
			<div class="flex justify-between items-center">
				<span class="text-sm text-muted-foreground">Chain</span>
				<span class="font-medium text-foreground">{{ CHAIN_NAME[selectedChainId] }}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-sm text-muted-foreground">Account Type</span>
				<span class="font-medium text-foreground">{{ displayAccountName(accountData().accountId) }}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-sm text-muted-foreground">Address</span>
				<span class="font-medium text-foreground font-mono">{{ shortenAddress(accountData().address) }}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-sm text-muted-foreground">Category</span>
				<span class="font-medium text-foreground">{{ accountData().category }}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-sm text-muted-foreground">Validation Options</span>
				<span class="font-medium text-foreground">
					{{ displayValidationOptions(accountData().vMethods) }}
				</span>
			</div>
		</div>

		<!-- Action Button -->
		<Button v-if="!isSuccess" @click="onClickConfirm"> Confirm </Button>
		<Button v-else @click="useImportAccountModal().closeModal()" variant="outline"> Done </Button>
	</div>
</template>

<style lang="css" scoped></style>
