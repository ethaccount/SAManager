<script lang="ts" setup>
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import { CoinbaseWalletConnector } from '@vue-dapp/coinbase'
import { ModalsContainer, useModal } from 'vue-final-modal'
import ConnectModal from './components/ConnectModal.vue'

const { open, close } = useModal({
	component: ConnectModal,
	attrs: {
		title: 'Hello World!',
		onConfirm() {
			close()
		},
	},
	slots: {
		default: '<p>The content of the modal</p>',
	},
})
const { addConnectors, isConnected, wallet } = useVueDapp()

addConnectors([
	new BrowserWalletConnector(),
	new CoinbaseWalletConnector({
		appName: 'Vue Dapp',
		jsonRpcUrl: 'https://ethereum-rpc.publicnode.com',
	}),
])

function onClickConnectButton() {
	open()
}
</script>

<template>
	<button @click="onClickConnectButton">{{ isConnected ? 'Disconnect' : 'Connect' }}</button>

	<div class="text-red-500">status: {{ wallet.status }}</div>
	<div>isConnected: {{ isConnected }}</div>
	<div>error: {{ wallet.error }}</div>

	<div v-if="isConnected">
		<div>chainId: {{ wallet.chainId }}</div>
		<div>address: {{ wallet.address }}</div>
	</div>

	<ModalsContainer />
</template>

<style></style>
