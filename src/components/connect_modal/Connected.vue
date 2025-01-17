<script setup lang="ts">
import { useAccount } from '@/stores/account'
import { useConnectModal } from '@/stores/useConnectModal'
import { shortenAddress } from '@vue-dapp/core'

const { close } = useConnectModal()
const { account } = useAccount()

function onClickConfirm() {
	close()
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
