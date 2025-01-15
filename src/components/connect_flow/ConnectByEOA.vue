<script setup lang="ts">
import { useConnectFlow } from '@/stores/connect_flow2'
import { useVueDapp, shortenAddress, RdnsEnum, type RDNS } from '@vue-dapp/core'
import { useVueDappModal } from '@vue-dapp/modal'

const emit = defineEmits(['next'])

const { providerDetails, wallet, address, status, connectTo, error, isConnected, watchWalletChanged } = useVueDapp()

const providerList = computed(() => {
	return providerDetails.value.slice().sort((a, b) => {
		if (a.info.rdns === RdnsEnum.rabby) return -1
		if (b.info.rdns === RdnsEnum.rabby) return 1
		if (a.info.rdns === RdnsEnum.metamask) return -1
		if (b.info.rdns === RdnsEnum.metamask) return 1
		return 0
	})
})

async function onClickWallet(rdns: RDNS) {
	useVueDappModal().close()
	await connectTo('BrowserWallet', { target: 'rdns', rdns })
}

const { updatePathData_CREATE } = useConnectFlow()

watchWalletChanged(
	async ({ address }) => {
		updatePathData_CREATE({
			connectedAddress: address,
		})
	},
	{
		immediate: true,
	},
)
</script>

<template>
	<div class="flex flex-col gap-2">
		<div class="flex flex-wrap gap-2">
			<Button
				class="w-full"
				v-for="detail in providerList"
				:key="detail.info.uuid"
				@click="onClickWallet(detail.info.rdns)"
				:disabled="status === 'connecting' || wallet.providerInfo?.rdns === detail.info.rdns"
			>
				<div>{{ detail.info.name }}</div>
			</Button>
			<p v-if="!providerList.length">No provider was found in this browser.</p>
		</div>

		<div
			:class="{
				'h-[200px]': status !== 'idle',
			}"
		>
			<div class="flex flex-col gap-1">
				<div v-if="status === 'connecting'">Connecting...</div>
				<div v-if="isConnected" class="flex flex-col gap-1">
					<div>{{ shortenAddress(address || '') }}</div>
				</div>
			</div>

			<p class="text-red-500">{{ error }}</p>
		</div>
	</div>
</template>
