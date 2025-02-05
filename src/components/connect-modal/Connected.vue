<script setup lang="ts">
import { useSA } from '@/stores/useSA'
import { useConnectModal } from '@/stores/useConnectModal'
import { useBlockchain } from '@/stores/useBlockchain'
import { shortenAddress } from '@vue-dapp/core'

const { store } = useConnectModal()
const { account } = useSA()

const error = ref<string | null>(null)

onMounted(() => {
	const { chainId } = useBlockchain()
	const { setAccount } = useSA()
	if (!store.value.deployedAddress || !store.value.validator || !store.value.accountId) {
		error.value = `Failed to connect to the account: ${store.value.deployedAddress} ${store.value.validator} ${store.value.accountId}`
		console.error(error.value)
		return
	}

	setAccount({
		address: store.value.deployedAddress,
		chainId: chainId.value,
		validator: store.value.validator,
		accountId: store.value.accountId,
	})
})

function onClickConfirm() {
	store.value.closeModal()
}
</script>

<template>
	<div>
		<div>address: {{ account?.address ? shortenAddress(account.address) : 'N/A' }}</div>
		<div>chainId: {{ account?.chainId }}</div>
		<div>accountId: {{ account?.accountId }}</div>
		<div>validator: {{ account?.validator }}</div>

		<div>
			<Button class="w-full" @click="onClickConfirm">Confirm</Button>
		</div>
	</div>
</template>

<style lang="css"></style>
