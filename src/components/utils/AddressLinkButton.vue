<script setup lang="ts">
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { ExternalLink } from 'lucide-vue-next'

const props = withDefaults(
	defineProps<{
		address: string
		size?: 'xs' | 'sm' | 'md'
	}>(),
	{
		size: 'sm',
	},
)

const SIZES = {
	xs: {
		button: 'w-4 h-4',
		icon: 'w-2.5',
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

const externalLink = computed(() => {
	if (!props.address) return ''
	const { explorerUrl } = useBlockchain()
	return `${explorerUrl.value}/address/${props.address}`
})

const buttonSize = computed(() => SIZES[props.size].button)
const iconSize = computed(() => SIZES[props.size].icon)
</script>

<template>
	<a v-if="externalLink" :href="externalLink" target="_blank">
		<div :class="buttonSize" class="link">
			<ExternalLink :class="iconSize" />
		</div>
	</a>
</template>

<style lang="css" scoped>
.link {
	@apply rounded-full bg-gray-100 flex items-center justify-center text-black;
}

.link:hover {
	@apply bg-gray-50 cursor-pointer;
}
</style>
