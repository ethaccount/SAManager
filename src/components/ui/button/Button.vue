<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { type ButtonVariants, buttonVariants } from '.'
import { Loader2 } from 'lucide-vue-next'

interface Props extends PrimitiveProps {
	variant?: ButtonVariants['variant']
	size?: ButtonVariants['size']
	class?: HTMLAttributes['class']
	loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	as: 'button',
	loading: false,
})

const isIcon = computed(() => props.size === 'icon')
const noSlot = computed(() => isIcon.value && props.loading)
</script>

<template>
	<Primitive :as="as" :as-child="asChild" :class="cn(buttonVariants({ variant, size }), props.class)">
		<Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
		<slot class="ml-2" v-if="!noSlot" />
	</Primitive>
</template>
