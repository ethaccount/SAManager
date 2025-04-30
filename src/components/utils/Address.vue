<script setup lang="ts">
import { shortenAddress } from '@vue-dapp/core'
import { ExternalLink } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/useNetwork'

const props = defineProps<{
	address?: string
}>()

const externalLink = computed(() => {
	if (!props.address) return ''
	const networkStore = useNetworkStore()
	if (!networkStore.explorerUrl) {
		return ''
	}
	return `${networkStore.explorerUrl}/address/${props.address}`
})
</script>

<template>
	<div class="inline-flex gap-1.5 items-center justify-between bg-gray-200 py-0.5 rounded-3xl">
		<!-- Address -->
		<span class="text-xs pl-3">{{ address && shortenAddress(address) }}</span>

		<div class="flex gap-0.5 items-center pr-0.5">
			<!-- Copy -->
			<CopyButton :address="address" />

			<!-- Link -->
			<a v-if="externalLink" :href="externalLink" target="_blank">
				<div class="address-button">
					<ExternalLink class="address-button-icon" />
				</div>
			</a>

			<slot name="button" />
		</div>
	</div>
</template>

<style lang="css">
.address-button {
	@apply w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-black;
}

.address-button:hover {
	@apply bg-gray-50 cursor-pointer;
}

.address-button-icon {
	@apply w-2.5;
}

.fade-enter-active,
.fade-leave-active {
	@apply transition-all duration-200;
}

.fade-enter-from,
.fade-leave-to {
	@apply opacity-0 transform scale-75;
}

.fade-enter-to,
.fade-leave-from {
	@apply opacity-100 transform scale-100;
}
</style>
