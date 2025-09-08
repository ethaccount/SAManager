<script setup lang="ts">
import { TransactionStatus, useExecutionModal } from '@/components/ExecutionModal'
import { encodeCallIdentifier, standardErrors, WalletSendCallsRequest } from '@samanager/sdk'
import { toBigInt } from 'ethers'
import { PaymasterServiceCapability } from '../account-capabilities'
import { PendingRequest } from './types'

const props = defineProps<{
	pendingRequest: PendingRequest<WalletSendCallsRequest['params']>
}>()

const { status } = useExecutionModal()

onMounted(() => {
	// set status to initial like useExecutionModalStore.openModal()
	status.value = TransactionStatus.Initial
})

const executions = computed(() => {
	const params = props.pendingRequest.params
	return params[0].calls.map(call => {
		return {
			to: call.to ?? '',
			data: call.data ?? '',
			value: BigInt(call.value ?? 0n),
		}
	})
})

const paymasterCapability = computed(() => {
	return props.pendingRequest.params[0].capabilities?.paymasterService as PaymasterServiceCapability
})

function onClickTxClose() {
	props.pendingRequest.reject(standardErrors.provider.userRejectedRequest())
}

function handleTxSent(hash: string) {
	props.pendingRequest.resolve({
		id: encodeCallIdentifier({
			chainId: toBigInt(props.pendingRequest.params[0].chainId),
			type: 0,
			hash,
		}),
	})
}
</script>

<template>
	<ExecutionUI
		:executions="executions"
		:use-modal-specific-style="false"
		:paymaster-capability="paymasterCapability"
		@close="onClickTxClose"
		@sent="handleTxSent"
	/>
</template>

<style lang="css" scoped></style>
