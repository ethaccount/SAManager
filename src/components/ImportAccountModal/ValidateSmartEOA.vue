<script setup lang="ts">
import { useNetwork } from '@/stores/network/useNetwork'
import { ADDRESS, getSmartEOADelegateAddress, isSameAddress } from 'sendop'
import { ref, onMounted } from 'vue'
import { useImportAccountModal } from '@/stores/useImportAccountModal'
import { AccountId } from '@/stores/account/account'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-vue-next'

const props = defineProps<{
	address: () => string
}>()

const emit = defineEmits<{ (e: 'confirm', accountId: AccountId): void }>()

const { client } = useNetwork()
const importAccountModal = useImportAccountModal()

const validationState = ref<'loading' | 'success' | 'failed'>('loading')
const errorMessage = ref<string>('')

onMounted(async () => {
	try {
		validationState.value = 'loading'
		const delegateAddress = await getSmartEOADelegateAddress(client.value, props.address())

		if (!delegateAddress) {
			validationState.value = 'failed'
			errorMessage.value = 'Not a Smart EOA account'
			return
		}

		// Check if it's a Simple7702Account
		if (isSameAddress(delegateAddress, ADDRESS.Simple7702AccountV08)) {
			validationState.value = 'success'
		} else {
			// TODO: Add logic to check if the accountId is supported
			validationState.value = 'failed'
			errorMessage.value = 'Unsupported delegate address'
		}
	} catch (error) {
		validationState.value = 'failed'
		errorMessage.value = error instanceof Error ? error.message : 'Unknown error occurred'
	}
})

const onClickConfirm = () => {
	emit('confirm', AccountId['infinitism.Simple7702Account.0.8.0'])
}

const onClickGoBack = () => {
	importAccountModal.goBackStage()
}
</script>

<template>
	<div class="flex flex-col items-center justify-center space-y-6 p-6">
		<!-- Loading State -->
		<div v-if="validationState === 'loading'" class="flex flex-col items-center space-y-4">
			<Loader2 class="h-12 w-12 animate-spin text-primary" />
			<p class="text-lg font-medium text-muted-foreground">Validating Smart EOA...</p>
		</div>

		<!-- Success State -->
		<div v-else-if="validationState === 'success'" class="flex flex-col items-center space-y-4">
			<CheckCircle2 class="h-12 w-12 text-green-500" />
			<p class="text-lg font-medium text-primary">Smart EOA Validated Successfully</p>

			<Button @click="onClickConfirm">Confirm</Button>
		</div>

		<!-- Failed State -->
		<div v-else-if="validationState === 'failed'" class="flex flex-col items-center space-y-4">
			<XCircle class="h-12 w-12 text-destructive" />
			<div class="text-center">
				<p class="text-lg font-medium text-destructive">Validation Failed</p>
				<p class="text-sm text-muted-foreground mt-2">{{ errorMessage }}</p>
			</div>
			<Button variant="outline" class="mt-4" @click="onClickGoBack">
				<ArrowLeft class="mr-2 h-4 w-4" />
				Go Back
			</Button>
		</div>
	</div>
</template>

<style lang="css" scoped></style>
