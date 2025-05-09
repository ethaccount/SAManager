<script lang="ts" setup>
import { useAccountDrawer } from '@/components/AccountDrawer/useAccountDrawer'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/stores/account/useAccount'
import { Wallet } from 'lucide-vue-next'

const { isAccountConnected, accounts } = useAccount()

function onClickAccountButton() {
	const { openAccountDrawer } = useAccountDrawer()
	openAccountDrawer()
}
</script>

<template>
	<div class="">
		<Button
			variant="outline"
			class="w-9 h-9 rounded-full ring-0"
			:class="{
				'ring-1 ring-green-500': isAccountConnected,
				'ring-1 ring-red-500': !isAccountConnected && accounts.length !== 0,
			}"
			@click="onClickAccountButton"
		>
			<Wallet class="w-4 h-4" />
		</Button>
	</div>
</template>

<style lang="css" scoped></style>
