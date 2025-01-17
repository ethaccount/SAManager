<script setup lang="ts">
import { useAccount } from '@/stores/account'
import { useConnectModal } from '@/stores/useConnectModal'
import { useApp } from '@/stores/app'
import { shortenAddress } from '@vue-dapp/core'

const { store } = useConnectModal()
const { account } = useAccount()

console.log(store.value)
const error = ref<string | null>(null)

onMounted(() => {
	const { chainId } = useApp()
	const { setAccount } = useAccount()
	if (!store.value.deployedAddress || !store.value.validator || !store.value.vendor) {
		error.value = `Failed to connect to the account: ${store.value.deployedAddress} ${store.value.validator} ${store.value.vendor}`
		return
	}

	setAccount({
		address: store.value.deployedAddress,
		chainId: chainId.value,
		validator: store.value.validator,
		vendor: store.value.vendor,
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
		<div>vendor: {{ account?.vendor }}</div>
		<div>validator: {{ account?.validator }}</div>

		<div>
			<Button class="w-full" @click="onClickConfirm">Confirm</Button>
		</div>
	</div>
</template>

<style lang="css"></style>
