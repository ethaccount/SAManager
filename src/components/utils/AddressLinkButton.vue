<script setup lang="ts">
import { useNetwork } from '@/stores/network/useNetwork'
import { ExternalLink } from 'lucide-vue-next'

const props = defineProps<{
	address: string
}>()

const externalLink = computed(() => {
	if (!props.address) return ''
	const { explorerUrl } = useNetwork()
	return `${explorerUrl.value}/address/${props.address}`
})
</script>

<template>
	<a v-if="externalLink" :href="externalLink" target="_blank">
		<div class="link">
			<ExternalLink class="link-icon" />
		</div>
	</a>
</template>

<style lang="css" scoped>
.link {
	@apply w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-black;
}

.link:hover {
	@apply bg-gray-50 cursor-pointer;
}

.link-icon {
	@apply w-2.5;
}
</style>
