<script setup lang="ts">
import { announceSAManagerProvider } from '@samanager/sdk'
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import { useVueDappModal, VueDappModal } from '@vue-dapp/modal'
import '@vue-dapp/modal/dist/style.css'

const { wallet, isConnected, connectors, addConnectors, watchWalletChanged, watchDisconnect, disconnect } = useVueDapp()

onMounted(() => {
	if (!connectors.value.find(connector => connector.name === 'BrowserWallet')) {
		addConnectors([new BrowserWalletConnector()])
	}

	// Announce SAManager as an EIP-6963 provider
	announceSAManagerProvider({
		debug: true,
		chainId: 11155111n,
		origin: 'http://localhost:5173',
	})
})

watchWalletChanged(async wallet => {
	console.log('wallet', wallet)
})

watchDisconnect(() => {
	console.log('disconnect')
})

// Function to auto-click SAManager wallet option
const autoClickSAManager = () => {
	const checkAndClick = () => {
		// Look for the modal
		const modal = document.getElementById('vd-modal') || document.querySelector('.vd-modal-column')
		if (modal) {
			// Find all wallet blocks
			const walletBlocks = modal.querySelectorAll('.vd-wallet-block')

			// Look for SAManager specifically
			for (const block of walletBlocks) {
				const walletName = block.querySelector('div')?.textContent?.trim()

				// Check if this is SAManager by name
				if (walletName === 'SAManager') {
					console.log('Auto-clicking SAManager wallet')
					;(block as HTMLElement).click()
					return true
				}
			}
		}
		return false
	}

	// Try immediately
	if (checkAndClick()) return
}

function onClickConnectButton() {
	if (isConnected.value) {
		disconnect()
	} else {
		useVueDappModal().open()
		// // Auto-click SAManager after modal opens
		// nextTick(() => {
		// 	setTimeout(autoClickSAManager, 100) // Small delay to ensure modal is rendered
		// })
	}
}

onMounted(() => {
	onClickConnectButton()
})
</script>

<template>
	<button class="btn" @click="onClickConnectButton">
		{{ isConnected ? 'Disconnect' : 'Connect' }}
	</button>

	<div>status: {{ wallet.status }}</div>
	<div>isConnected: {{ isConnected }}</div>
	<div>error: {{ wallet.error }}</div>

	<div v-if="isConnected">
		<div>chainId: {{ wallet.chainId }}</div>
		<div>address: {{ wallet.address }}</div>
	</div>

	<RouterView />

	<VueDappModal dark auto-connect />
</template>

<style scoped></style>
