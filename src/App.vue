<script lang="ts" setup>
import { Button } from '@/components/ui/button'
import { CoinbaseWalletConnector } from '@vue-dapp/coinbase'
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import { ModalsContainer, useModal } from 'vue-final-modal'
import ConnectModal from './components/ConnectModal.vue'
// import { useColorMode } from '@vueuse/core'
import { VueDappModal } from '@vue-dapp/modal'
import '@vue-dapp/modal/dist/style.css'

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
const { addConnectors, isConnected, wallet, disconnect } = useVueDapp()

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
	<div class="p-5">
		<div class="text-red-500">status: {{ wallet.status }}</div>
		<div>isConnected: {{ isConnected }}</div>
		<div>error: {{ wallet.error }}</div>

		<div v-if="isConnected">
			<div>chainId: {{ wallet.chainId }}</div>
			<div>address: {{ wallet.address }}</div>
			<Button @click="disconnect">Disconnect</Button>
		</div>

		<div class="mt-5">
			<Button @click="onClickConnectButton">Connect Smart Account</Button>
		</div>

		<router-view></router-view>

		<VueDappModal dark auto-connect />
		<ModalsContainer />
	</div>
</template>

<style></style>
