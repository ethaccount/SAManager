<script setup lang="ts">
import { parseError } from '@/lib/error'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/validation/useSigner'
import { RdnsEnum, shortenAddress, type RDNS } from '@vue-dapp/core'
import { useVueDappModal } from '@vue-dapp/modal'
import { Loader2 } from 'lucide-vue-next'

const emit = defineEmits<{ (e: 'confirm', address: string): void }>()

const { providerDetails, wallet, address, status, connectTo, isEOAWalletConnected } = useEOAWallet()

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

const onClickConfirm = () => {
	if (!address.value) {
		throw new Error('No address found')
	}

	emit('confirm', address.value)
}
</script>

<template>
	<div class="flex flex-col gap-4 p-4 w-full mx-auto">
		<!-- Wallet Provider Buttons -->
		<div class="flex flex-col gap-3">
			<div class="grid gap-2">
				<Button
					v-for="detail in providerList"
					:key="detail.info.uuid"
					@click="onClickWallet(detail.info.rdns)"
					:disabled="status === 'connecting' || wallet.providerInfo?.rdns === detail.info.rdns"
					class="wallet-button"
				>
					<div class="flex items-center gap-3">
						<span class="font-medium">{{ detail.info.name }}</span>
					</div>
				</Button>
				<p v-if="!providerList.length" class="text-center text-muted-foreground py-4">
					No wallet providers found in this browser
				</p>
			</div>
		</div>

		<!-- Status Section -->
		<div class="min-h-[60px]">
			<div v-if="status === 'connecting'" class="flex items-center justify-center gap-2 text-muted-foreground">
				<Loader2 class="w-4 h-4 animate-spin" />
				<span>Connecting to wallet...</span>
			</div>

			<div v-if="isEOAWalletConnected" class="flex flex-col gap-3 p-4 bg-secondary rounded-[--radius] border">
				<div class="flex items-center gap-2 text-foreground">
					<span>✓</span>
					<span>{{ wallet.providerInfo?.name }} Connected</span>
				</div>
				<div class="flex items-center justify-between">
					<code class="px-3 py-1 bg-muted rounded-[--radius] text-muted-foreground">
						{{ shortenAddress(address || '') }}
					</code>
					<Button @click="onClickConfirm" class="bg-primary text-primary-foreground hover:bg-primary/90 px-6">
						Confirm
					</Button>
				</div>
			</div>

			<p v-if="connectError" class="error-section">
				{{ connectError }}
			</p>
		</div>
	</div>
</template>

<style lang="css" scoped>
.wallet-button {
	@apply flex items-center justify-between p-4 bg-card text-card-foreground rounded-[--radius] border;
	@apply hover:bg-accent hover:text-accent-foreground transition-colors;
}

.wallet-button:disabled {
	@apply opacity-50 cursor-not-allowed hover:bg-card;
}
</style>
