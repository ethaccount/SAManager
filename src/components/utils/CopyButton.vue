<script setup lang="ts">
import { Copy, Check } from 'lucide-vue-next'

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(
	defineProps<{
		address?: string
		size?: 'xs' | 'sm'
		isRound?: boolean
	}>(),
	{
		size: 'sm',
		isRound: true,
	},
)

const isCopied = ref(false)

function onClickCopyAddress(event: Event) {
	event.stopPropagation()
	if (!props.address) {
		throw new Error('CopyButton: address is required')
	}
	navigator.clipboard.writeText(props.address)
	isCopied.value = true
	setTimeout(() => {
		isCopied.value = false
	}, 500)
}

const SIZES = {
	xs: {
		button: 'w-4 h-4',
		icon: 'w-2',
	},
	sm: {
		button: 'w-5 h-5',
		icon: 'w-2.5',
	},
	md: {
		button: 'w-6 h-6',
		icon: 'w-3',
	},
} as const

const buttonSize = computed(() => SIZES[props.size].button)
const iconSize = computed(() => SIZES[props.size].icon)

const buttonClass = computed(() => {
	const baseClasses = `${buttonSize.value} text-black flex items-center justify-center hover:cursor-pointer`
	if (!props.isRound) return `${baseClasses} text-gray-700 hover:text-gray-900`
	return `${baseClasses} rounded-full bg-gray-100 hover:bg-gray-50`
})
</script>

<template>
	<div v-if="address" :class="buttonClass" @click="onClickCopyAddress">
		<Transition name="fade" mode="out-in">
			<Copy v-if="!isCopied" :class="iconSize" />
			<Check v-else :class="iconSize" />
		</Transition>
	</div>
</template>
