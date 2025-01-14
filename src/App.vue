<script lang="ts" setup>
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import { CoinbaseWalletConnector } from '@vue-dapp/coinbase'
import { ModalsContainer, useModal } from 'vue-final-modal'
import ConnectModal from './components/ConnectModal.vue'
import { Button } from '@/components/ui/button'
import { useColorMode } from '@vueuse/core'

const { open, close } = useModal({
	component: ConnectModal,
	attrs: {
		title: 'Hello World!',
		onClose() {
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
	<div class="flex flex-col items-center justify-center h-screen">
		<Button @click="onClickConnectButton">{{ isConnected ? 'Disconnect' : 'Connect' }}</Button>

		<div class="text-red-500">status: {{ wallet.status }}</div>
		<div>isConnected: {{ isConnected }}</div>
		<div>error: {{ wallet.error }}</div>

		<div v-if="isConnected">
			<div>chainId: {{ wallet.chainId }}</div>
			<div>address: {{ wallet.address }}</div>
		</div>

		<ModalsContainer />
	</div>
</template>

<style></style>
