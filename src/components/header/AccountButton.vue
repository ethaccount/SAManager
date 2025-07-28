<script lang="ts" setup>
import { useAccountDrawer } from '@/components/AccountDrawer/useAccountDrawer'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/stores/account/useAccount'
import { shortenAddress } from '@vue-dapp/core'
import { Wallet } from 'lucide-vue-next'

const { isAccountAccessible, selectedAccount } = useAccount()
const { toggle } = useAccountDrawer() // must be placed outside onClickAccountButton

function onClickAccountButton() {
	toggle()
}
</script>

<template>
	<div class="">
		<Button
			v-if="!isAccountAccessible"
			variant="outline"
			class="w-9 h-9 rounded-full ring-0"
			:class="{
				'ring-1 ring-green-500': isAccountAccessible,
			}"
			@click="onClickAccountButton"
		>
			<Wallet class="w-4 h-4" />
		</Button>
		<div v-else class="flex items-center flex-col cursor-pointer" @click="onClickAccountButton">
			<div
				v-if="selectedAccount"
				class="h-[36px] rounded-3xl border border-border flex sm:inline-flex items-center pl-3.5 pr-2 gap-x-2 hover:bg-accent"
			>
				<!-- Address -->
				<p class="text-sm">{{ shortenAddress(selectedAccount.address) }}</p>

				<div class="flex items-center">
					<CopyButton :address="selectedAccount.address" />
				</div>
			</div>
			<div v-else>
				<p>Error: Account is connected but no account is selected</p>
			</div>
		</div>
	</div>
</template>

<style lang="css" scoped></style>
