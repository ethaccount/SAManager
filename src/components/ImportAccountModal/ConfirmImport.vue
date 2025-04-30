<script setup lang="ts">
import { shortenAddress } from '@vue-dapp/core'
import { CheckCircle2 } from 'lucide-vue-next'
import { ref } from 'vue'
import { useImportAccountModal } from '@/stores/useImportAccountModal'
import { AccountType, useImportedAccounts, ValidationOption } from '@/stores/useImportedAccounts'
import { useBlockchain } from '@/stores/useBlockchain'
import { CHAIN_NAME } from '@/lib/network'
import { AccountId, displayAccountName } from '@/lib/account'

const props = defineProps<{
	address: () => string
	accountId: () => AccountId
	vOptions: () => ValidationOption[]
	type: () => AccountType
}>()

const { chainId } = useBlockchain()
const isSuccess = ref(false)

const onClickConfirm = () => {
	useImportedAccounts().addAccount({
		address: props.address(),
		accountId: props.accountId(),
		vOptions: props.vOptions(),
		type: props.type(),
		chainId: chainId.value,
	})
	isSuccess.value = true
	// setTimeout(() => {
	// 	useImportAccountModal().closeModal()
	// }, 3000)
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
		<div v-if="isSuccess" class="text-emerald-500">
			<CheckCircle2 class="w-16 h-16" />
		</div>

		<!-- Account Details -->
		<div v-if="!isSuccess" class="w-full max-w-sm space-y-3 bg-muted/30 rounded-lg p-4">
			<div class="flex justify-between items-center">
				<span class="text-sm text-muted-foreground">Chain ID</span>
				<span class="font-medium text-foreground">{{ CHAIN_NAME[chainId] }}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-sm text-muted-foreground">Account</span>
				<span class="font-medium text-foreground">{{ displayAccountName(accountId()) }}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-sm text-muted-foreground">Address</span>
				<span class="font-medium text-foreground font-mono">{{ shortenAddress(address()) }}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-sm text-muted-foreground">Type</span>
				<span class="font-medium text-foreground">{{ type() }}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-sm text-muted-foreground">Validation Options</span>
				<span class="font-medium text-foreground">
					{{
						vOptions()?.length
							? vOptions()
									.map(v => v.type)
									.join(', ')
							: 'None'
					}}
				</span>
			</div>
		</div>

		<!-- Action Button -->
		<Button v-if="!isSuccess" @click="onClickConfirm"> Confirm </Button>
		<Button v-else @click="useImportAccountModal().closeModal()" variant="outline"> Done </Button>
	</div>
</template>

<style lang="css" scoped>
.text-emerald-500 {
	color: #10b981;
}
</style>
