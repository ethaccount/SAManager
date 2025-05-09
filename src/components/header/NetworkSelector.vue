<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
	CHAIN_ID,
	displayChainName,
	SUPPORTED_BUNDLER,
	SUPPORTED_ENTRY_POINT,
	SUPPORTED_NODE,
} from '@/stores/network/network'
import { useNetwork } from '@/stores/network/useNetwork'
import { Check } from 'lucide-vue-next'
import ChainIcon from '@/components/ChainIcon.vue'

// Watch for popover state changes to toggle body scroll lock
const isOpen = ref(false)
watch(isOpen, newValue => {
	if (newValue) {
		document.body.style.overflow = 'hidden'
	} else {
		document.body.style.overflow = ''
	}
})

const {
	selectedChainId,
	supportedChainIds,
	selectedNode,
	selectedBundler,
	selectedEntryPoint,
	supportedBundlers,
	supportedNodes,
	supportedEntryPoints,
} = useNetwork()

function displayBundlerName(bundler: SUPPORTED_BUNDLER) {
	switch (bundler) {
		case SUPPORTED_BUNDLER.PIMLICO:
			return 'Pimlico'
		case SUPPORTED_BUNDLER.ALCHEMY:
			return 'Alchemy'
		default:
			return 'Unknown'
	}
}

function displayNodeName(node: SUPPORTED_NODE) {
	switch (node) {
		case SUPPORTED_NODE.ALCHEMY:
			return 'Alchemy'
		case SUPPORTED_NODE.PUBLIC_NODE:
			return 'Public Node'
		default:
			return 'Unknown'
	}
}

function onClickChain(id: CHAIN_ID) {
	selectedChainId.value = id
}

function onClickBundler(bundler: SUPPORTED_BUNDLER) {
	selectedBundler.value = bundler
}

function onClickEntryPoint(ep: SUPPORTED_ENTRY_POINT) {
	selectedEntryPoint.value = ep
}

function onClickNode(node: SUPPORTED_NODE) {
	selectedNode.value = node
}
</script>

<template>
	<Popover v-model:open="isOpen">
		<PopoverTrigger as-child>
			<Button variant="outline">
				{{ displayChainName(selectedChainId) }}
			</Button>
		</PopoverTrigger>

		<PopoverContent class="w-80 max-h-[80vh] overflow-y-auto p-4 divide-y">
			<!-- Chain Section -->
			<div class="py-3 first:pt-0 last:pb-0">
				<h3 class="text-sm font-semibold uppercase tracking-wider mb-3">Network</h3>
				<div class="flex flex-col gap-1">
					<Button
						v-for="id in supportedChainIds"
						:key="id"
						variant="ghost"
						:class="['justify-between', selectedChainId === id ? 'bg-accent font-medium' : '']"
						@click="onClickChain(id)"
					>
						<div class="flex items-center gap-2">
							<ChainIcon :chain-id="id" :size="24" :show-tooltip="false" />
							{{ displayChainName(id) }}
						</div>
						<Check v-if="selectedChainId === id" class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<!-- Bundler Section -->
			<div class="py-3">
				<h3 class="text-sm font-semibold uppercase tracking-wider mb-3">Bundler</h3>
				<div class="flex flex-col gap-1">
					<Button
						v-for="bundler in supportedBundlers"
						:key="bundler"
						variant="ghost"
						:class="['justify-between', selectedBundler === bundler ? 'bg-accent font-medium' : '']"
						@click="onClickBundler(bundler)"
					>
						{{ displayBundlerName(bundler) }}
						<Check v-if="selectedBundler === bundler" class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<!-- Node Section -->
			<div class="py-3">
				<h3 class="text-sm font-semibold uppercase tracking-wider mb-3">Node</h3>
				<div class="flex flex-col gap-1">
					<Button
						v-for="node in supportedNodes"
						:key="node"
						variant="ghost"
						:class="['justify-between', selectedNode === node ? 'bg-accent font-medium' : '']"
						@click="onClickNode(node)"
					>
						{{ displayNodeName(node) }}
						<Check v-if="selectedNode === node" class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</PopoverContent>
	</Popover>
</template>

<style lang="css" scoped></style>
