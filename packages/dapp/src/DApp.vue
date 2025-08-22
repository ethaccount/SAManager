<script setup lang="ts">
import { announceSAManagerProvider } from '@samanager/sdk'
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import { useVueDappModal, VueDappModal } from '@vue-dapp/modal'
import '@vue-dapp/modal/dist/style.css'

const { wallet, provider, isConnected, connectors, addConnectors, watchWalletChanged, watchDisconnect, disconnect } =
	useVueDapp()

const DAPP_CHAIN_ID = 11155111n

onMounted(() => {
	if (!connectors.value.find(connector => connector.name === 'BrowserWallet')) {
		addConnectors([new BrowserWalletConnector()])
	}

	// Announce SAManager as an EIP-6963 provider
	announceSAManagerProvider({
		debug: true,
		chainId: DAPP_CHAIN_ID,
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

const error = ref<string | null>(null)
const block = ref(null)

async function onClickGetBlock() {
	error.value = null
	block.value = null
	if (wallet.status === 'connected' && provider.value) {
		try {
			block.value = await provider.value.request({
				method: 'eth_getBlockByNumber',
				params: ['latest', false],
			})
		} catch (err: unknown) {
			console.error('Error getting block', err)
			error.value = err && typeof err === 'object' && 'message' in err ? (err.message as string) : 'Unknown error'
		}
	} else {
		error.value = 'Wallet not connected'
	}
}

onMounted(() => {
	onClickConnectButton()
})
</script>

<template>
	<div class="p-4">
		<div>
			<button class="btn" @click="onClickConnectButton">
				{{ isConnected ? 'Disconnect' : 'Connect' }}
			</button>
		</div>

		<div>status: {{ wallet.status }}</div>
		<div>isConnected: {{ isConnected }}</div>
		<div>error: {{ wallet.error }}</div>

		<div v-if="isConnected">
			<div>chainId: {{ wallet.chainId }}</div>
			<div>address: {{ wallet.address }}</div>
		</div>

		<br />

		<div>
			<button class="btn" @click="onClickGetBlock">eth_getBlockByNumber</button>
			<div v-if="error" class="text-red-500">{{ error }}</div>
			<div v-if="block">
				<div>block: {{ (block as any).hash }}</div>
			</div>
		</div>

		<RouterView />
	</div>

	<VueDappModal dark auto-connect />
</template>

<style scoped></style>
