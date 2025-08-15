<script setup lang="ts">
import ChainIcon from '@/components/ChainIcon.vue'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_CHAIN_IDS } from '@/config'
import { CHAIN_ID, displayChainName, SUPPORTED_BUNDLER, SUPPORTED_NODE } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { Check } from 'lucide-vue-next'

const isOpen = ref(false)

const { selectedChainId, selectedNode, selectedBundler, supportedBundlers, supportedNodes } = useBlockchain()

function displayBundlerName(bundler: SUPPORTED_BUNDLER) {
	switch (bundler) {
		case SUPPORTED_BUNDLER.PIMLICO:
			return 'Pimlico'
		case SUPPORTED_BUNDLER.ALCHEMY:
			return 'Alchemy'
		case SUPPORTED_BUNDLER.ETHERSPOT:
			return 'Etherspot'
		case SUPPORTED_BUNDLER.CANDIDE:
			return 'Candide'
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

function onClickNode(node: SUPPORTED_NODE) {
	selectedNode.value = node
}

function onClickNetworkSelector() {
	isOpen.value = true
}
</script>

<template>
	<DropdownMenu v-model:open="isOpen">
		<DropdownMenuTrigger as-child>
			<Button variant="outline" class="hidden sm:flex rounded-full pl-1.5 py-1" @click="onClickNetworkSelector">
				<ChainIcon :chain-id="selectedChainId" :size="24" :show-tooltip="false" />
				{{ displayChainName(selectedChainId) }}
			</Button>
			<Button
				variant="ghost"
				size="icon"
				class="sm:hidden flex items-center justify-center"
				@click="onClickNetworkSelector"
			>
				<ChainIcon :chain-id="selectedChainId" :size="32" :show-tooltip="false" />
			</Button>
		</DropdownMenuTrigger>

		<DropdownMenuContent class="w-80 max-h-[80vh] overflow-y-auto">
			<!-- Network Section -->
			<DropdownMenuLabel>Network</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuGroup class="space-y-1">
				<DropdownMenuItem
					v-for="id in SUPPORTED_CHAIN_IDS"
					:key="id"
					class="cursor-pointer"
					:class="selectedChainId === id ? 'bg-accent font-medium' : ''"
					@click="onClickChain(id)"
				>
					<div class="item-container">
						<div class="flex items-center gap-2">
							<ChainIcon :chain-id="id" :size="24" :show-tooltip="false" />
							<span>{{ displayChainName(id) }}</span>
						</div>
						<Check v-if="selectedChainId === id" class="h-4 w-4" />
					</div>
				</DropdownMenuItem>
			</DropdownMenuGroup>

			<!-- Bundler Section -->
			<DropdownMenuSeparator />
			<DropdownMenuLabel>Bundler</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuGroup class="space-y-1">
				<DropdownMenuItem
					v-for="bundler in supportedBundlers"
					:key="bundler"
					class="cursor-pointer"
					:class="selectedBundler === bundler ? 'bg-accent font-medium' : ''"
					@click="onClickBundler(bundler)"
				>
					<div class="item-container">
						<span>{{ displayBundlerName(bundler) }}</span>
						<Check v-if="selectedBundler === bundler" class="h-4 w-4" />
					</div>
				</DropdownMenuItem>
			</DropdownMenuGroup>

			<!-- Node Section -->
			<DropdownMenuSeparator />
			<DropdownMenuLabel>Node</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuGroup class="space-y-1">
				<DropdownMenuItem
					v-for="node in supportedNodes"
					:key="node"
					class="cursor-pointer"
					:class="selectedNode === node ? 'bg-accent font-medium' : ''"
					@click="onClickNode(node)"
				>
					<div class="item-container">
						<span>{{ displayNodeName(node) }}</span>
						<Check v-if="selectedNode === node" class="h-4 w-4" />
					</div>
				</DropdownMenuItem>
			</DropdownMenuGroup>
		</DropdownMenuContent>
	</DropdownMenu>
</template>

<style lang="css" scoped>
.item-container {
	@apply flex items-center justify-between w-full pl-4;
}
</style>
