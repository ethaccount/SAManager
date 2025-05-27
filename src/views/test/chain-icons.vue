<script setup lang="ts">
import NetworkIcon from '@/components/ChainIcon.vue'
import { MAINNET_CHAIN_ID, TESTNET_CHAIN_ID } from '@/stores/blockchain/blockchain'

const chainIds = [
	MAINNET_CHAIN_ID.ETHEREUM,
	MAINNET_CHAIN_ID.POLYGON,
	MAINNET_CHAIN_ID.OPTIMISM,
	MAINNET_CHAIN_ID.ARBITRUM,
	MAINNET_CHAIN_ID.BASE,
	TESTNET_CHAIN_ID.SEPOLIA,
	TESTNET_CHAIN_ID.ARBITRUM_SEPOLIA,
	TESTNET_CHAIN_ID.OPTIMISM_SEPOLIA,
	TESTNET_CHAIN_ID.BASE_SEPOLIA,
	TESTNET_CHAIN_ID.POLYGON_AMOY,
]
</script>

<template>
	<div class="icons-grid">
		<NetworkIcon v-for="chainId in chainIds" :key="chainId" :chain-id="chainId" :size="50" />
	</div>
</template>

<style lang="css" scoped>
.icons-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(56px, 1fr));
	gap: 20px;
	padding: 16px;
}
</style>
