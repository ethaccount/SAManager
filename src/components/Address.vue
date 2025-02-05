<script setup lang="ts">
import { shortenAddress } from '@vue-dapp/core'
import { Copy, ExternalLink, Check } from 'lucide-vue-next'

const props = defineProps<{
	address?: string
}>()

const externalLink = computed(() => {
	return `https://sepolia.etherscan.io/address/${props.address}`
})

const isCopied = ref(false)

const onClickCopyAddress = () => {
	navigator.clipboard.writeText(props.address || '')
	isCopied.value = true
	setTimeout(() => {
		isCopied.value = false
	}, 500)
}
</script>

<template>
	<div class="inline-flex gap-1.5 items-center justify-between bg-gray-200 py-0.5 rounded-3xl">
		<!-- Address -->
		<span class="text-sm pl-3">{{ address && shortenAddress(address) }}</span>

		<div class="flex gap-1 items-center pr-1">
			<!-- Copy -->
			<Button class="address-button" variant="link" size="icon" @click="onClickCopyAddress">
				<Transition name="fade" mode="out-in">
					<Copy v-if="!isCopied" key="copy" class="address-button-icon" />
					<Check v-else key="check" class="address-button-icon" />
				</Transition>
			</Button>

			<!-- Link -->
			<a :href="externalLink" target="_blank">
				<Button class="address-button" variant="link" size="icon">
					<ExternalLink class="address-button-icon" />
				</Button>
			</a>
		</div>
	</div>
</template>

<style lang="css">
.address-button {
	@apply w-5 h-5 rounded-full bg-gray-100;
}

.address-button:hover {
	@apply bg-gray-50;
}

.address-button-icon {
	@apply w-3 h-3;
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
