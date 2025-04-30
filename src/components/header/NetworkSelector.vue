<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { CHAIN_ID, CHAIN_NAME } from '@/lib/network'
import { useBlockchain } from '@/stores/useBlockchain'
import { ref, watch } from 'vue'

// Add new interfaces/types
interface EntryPoint {
	version: string
	address: string
}

interface Bundler {
	name: string
	address: string
}

interface EthereumNode {
	name: string
	url: string
}

// Add refs for each selection
const { chainId, chainIds } = useBlockchain()
const isOpen = ref(false)
const selectedBundler = ref<string>('')
const selectedEntryPoint = ref<string>('0.7')
const selectedNode = ref<string>('alchemy')

// Watch for popover state changes to toggle body scroll lock
watch(isOpen, newValue => {
	if (newValue) {
		document.body.style.overflow = 'hidden'
	} else {
		document.body.style.overflow = ''
	}
})

// Constants for selections
const bundlers: Bundler[] = [
	{ name: 'Pimlico Bundler', address: '0x...' },
	{ name: 'Alchemy Bundler', address: '0x...' },
]

const entryPoints: EntryPoint[] = [
	{ version: '0.7', address: '0x...' },
	{ version: '0.8', address: '0x...' },
]

const nodes: EthereumNode[] = [
	{ name: 'Alchemy Node', url: 'https://...' },
	{ name: 'Public Node', url: 'https://...' },
]

function selectNetwork(id: CHAIN_ID) {
	chainId.value = id
	isOpen.value = false // Close popover after selection
}

function selectBundler(bundler: Bundler) {
	selectedBundler.value = bundler.name
}

function selectEntryPoint(ep: EntryPoint) {
	selectedEntryPoint.value = ep.version
}

function selectNode(node: EthereumNode) {
	selectedNode.value = node.name
}
</script>

<template>
	<Popover v-model:open="isOpen">
		<PopoverTrigger as-child>
			<Button variant="outline">
				{{ CHAIN_NAME[chainId] }}
			</Button>
		</PopoverTrigger>

		<PopoverContent class="w-80 max-h-[80vh] overflow-y-auto p-4 divide-y">
			<!-- Networks Section -->
			<div class="py-3 first:pt-0 last:pb-0">
				<h3 class="text-sm font-semibold uppercase tracking-wider mb-3">Network</h3>
				<div class="flex flex-col gap-1">
					<Button
						v-for="id in chainIds"
						:key="id"
						variant="ghost"
						:class="['justify-start', chainId === id ? 'bg-accent font-medium' : '']"
						@click="selectNetwork(id)"
					>
						{{ CHAIN_NAME[id] }}
					</Button>
				</div>
			</div>

			<!-- Bundlers Section -->
			<div class="py-3">
				<h3 class="text-sm font-semibold uppercase tracking-wider mb-3">Bundler</h3>
				<div class="flex flex-col gap-1">
					<Button
						v-for="bundler in bundlers"
						:key="bundler.name"
						variant="ghost"
						:class="['justify-start', selectedBundler === bundler.name ? 'bg-accent font-medium' : '']"
						@click="selectBundler(bundler)"
					>
						{{ bundler.name }}
					</Button>
				</div>
			</div>

			<!-- Entry Points Section -->
			<div class="py-3">
				<h3 class="text-sm font-semibold uppercase tracking-wider mb-3">Entry Point</h3>
				<div class="flex flex-col gap-1">
					<Button
						v-for="ep in entryPoints"
						:key="ep.version"
						variant="ghost"
						:class="['justify-start', selectedEntryPoint === ep.version ? 'bg-accent font-medium' : '']"
						@click="selectEntryPoint(ep)"
					>
						Entry Point v{{ ep.version }}
					</Button>
				</div>
			</div>

			<!-- Ethereum Nodes Section -->
			<div class="py-3">
				<h3 class="text-sm font-semibold uppercase tracking-wider mb-3">Ethereum Node</h3>
				<div class="flex flex-col gap-1">
					<Button
						v-for="node in nodes"
						:key="node.name"
						variant="ghost"
						:class="['justify-start', selectedNode === node.name ? 'bg-accent font-medium' : '']"
						@click="selectNode(node)"
					>
						{{ node.name }}
					</Button>
				</div>
			</div>
		</PopoverContent>
	</Popover>
</template>

<style lang="css" scoped></style>
