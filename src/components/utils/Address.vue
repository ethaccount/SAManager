<script setup lang="ts">
import { shortenAddress } from '@vue-dapp/core'
import AddressLinkButton from './AddressLinkButton.vue'
import CopyButton from './CopyButton.vue'

interface Props {
	address: string
	textSize?: 'xs' | 'sm' | 'base'
	buttonSize?: 'xs' | 'sm' | 'md'
	showButtons?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	textSize: 'sm',
	buttonSize: 'xs',
	showButtons: true,
})

const textSizeClass = computed(() => {
	switch (props.textSize) {
		case 'xs':
			return 'text-xs'
		case 'sm':
			return 'text-sm'
		case 'base':
			return 'text-base'
		default:
			return 'text-sm'
	}
})

// CopyButton only supports 'xs' and 'sm', so map 'md' to 'sm'
const copyButtonSize = computed(() => {
	return props.buttonSize === 'md' ? 'sm' : props.buttonSize
})
</script>

<template>
	<div class="flex items-center gap-1">
		<span class="font-medium truncate" :class="textSizeClass">
			{{ shortenAddress(address) }}
		</span>
		<div v-if="showButtons" class="flex items-center gap-1">
			<CopyButton :size="copyButtonSize" :address="address" />
			<AddressLinkButton :size="buttonSize" :address="address" />
		</div>
	</div>
</template>

<style lang="css" scoped></style>
