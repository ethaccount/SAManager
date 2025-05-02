<script setup lang="ts">
import { parseError } from '@/lib/error'
import { useConnectModal } from '@/stores/useConnectModal'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { RdnsEnum, shortenAddress, type RDNS } from '@vue-dapp/core'
import { useVueDappModal } from '@vue-dapp/modal'

const emit = defineEmits(['next'])

const { providerDetails, wallet, address, status, connectTo, isEOAWalletConnected, watchWalletChanged } = useEOAWallet()

const providerList = computed(() => {
	return providerDetails.value.slice().sort((a, b) => {
		if (a.info.rdns === RdnsEnum.rabby) return -1
		if (b.info.rdns === RdnsEnum.rabby) return 1
		if (a.info.rdns === RdnsEnum.metamask) return -1
		if (b.info.rdns === RdnsEnum.metamask) return 1
		return 0
	})
})

const connectError = ref<string | null>(null)

async function onClickWallet(rdns: RDNS) {
	connectError.value = null
	useVueDappModal().close()
	try {
		await connectTo('BrowserWallet', { target: 'rdns', rdns })
	} catch (err: unknown) {
		const e = parseError(err)

		// Do not show error when the user cancels their action
		if (
			e.message.includes('user rejected action') ||
			e.message.includes('User rejected the request.') ||
			e.message.includes('4001')
		) {
			return
		}
		connectError.value = e.message
	}
}

const { updateStore } = useConnectModal()

watchWalletChanged(
	async ({ address }) => {
		updateStore({
			eoaAddress: address,
		})
	},
	{
		immediate: true,
	},
)

function onClickNext() {
	const { goNextStage } = useConnectModal()
	goNextStage()
}
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
				'h-[50px]': status !== 'idle',
			}"
		>
			<div class="flex flex-col gap-1">
				<div v-if="status === 'connecting'">Connecting...</div>
				<div v-if="isEOAWalletConnected" class="flex flex-col gap-1">
					<div>{{ shortenAddress(address || '') }}</div>
					<Button class="w-full" @click="onClickNext">Next</Button>
				</div>
			</div>

			<p class="text-red-500">{{ connectError }}</p>
		</div>
	</div>
</template>
