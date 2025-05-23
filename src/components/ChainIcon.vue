<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CHAIN_ICONS } from '@/stores/network/chain-icons'
import { isTestnet } from '@/stores/network/network'

interface Props {
	chainId: string
	size?: number
	showTooltip?: boolean
	borderColor?: 'default' | 'red' | 'green'
}

const props = withDefaults(defineProps<Props>(), {
	size: 40,
	showTooltip: true,
	borderColor: 'default',
})

const networkData = computed(() => {
	return CHAIN_ICONS[props.chainId] || { icon: '', name: 'Unknown Network' }
})

const containerStyle = computed(() => ({
	width: `${props.size}px`,
	height: `${props.size}px`,
}))

const fallbackText = computed(() => networkData.value.name.charAt(0).toUpperCase())

const iconContainerClass = computed(() => ({
	'icon-container': true,
	'border-red-500': props.borderColor === 'red',
	'border-green-500': props.borderColor === 'green',
	'border-dashed': isTestnet(props.chainId),
	'border-solid': !isTestnet(props.chainId),
}))
</script>

<template>
	<template v-if="showTooltip">
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div :class="iconContainerClass" :style="containerStyle">
						<template v-if="networkData.icon">
							<img :src="networkData.icon" :alt="networkData.name" class="chain-icon" />
						</template>
						<template v-else>
							<span class="fallback-text">{{ fallbackText }}</span>
						</template>
					</div>
				</TooltipTrigger>
				<TooltipContent class="z-[1100]">{{ networkData.name }}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	</template>
	<template v-else>
		<div :class="iconContainerClass" :style="containerStyle">
			<template v-if="networkData.icon">
				<img :src="networkData.icon" :alt="networkData.name" class="chain-icon" />
			</template>
			<template v-else>
				<span class="fallback-text">{{ fallbackText }}</span>
			</template>
		</div>
	</template>
</template>

<style lang="css" scoped>
.icon-container {
	@apply border-2;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 3px;
	cursor: pointer;
}

.chain-icon {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.fallback-text {
	font-size: calc(v-bind(size) * 0.5px);
	font-weight: bold;
	color: #666;
}
</style>
