<script lang="ts" setup>
import { CoinbaseWalletConnector } from '@vue-dapp/coinbase'
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import { ModalsContainer, useModal } from 'vue-final-modal'
import ConnectModal from './components/connect_modal/ConnectModal.vue'
// import { useColorMode } from '@vueuse/core'
import { VueDappModal } from '@vue-dapp/modal'
import '@vue-dapp/modal/dist/style.css'
import ConnectModal3 from '@/components/connect_flow/ConnectModal.vue'
import { useEthers } from './stores/ethers'
import { useConnectModal } from './stores/connect_modal'
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

const { historyStage, start, step, stage } = useConnectModal()

function onClickConnectButton() {
	open()
	start()
}

const { open: open3, close: close3 } = useModal({
	component: ConnectModal3,
	attrs: {
		title: 'Hello World!',
		onClose() {
			close3()
		},
	},
	slots: {
		default: '<p>The content of the modal</p>',
	},
})

function onClickConnectButton3() {
	open3()
}

const { watchWalletChanged, watchDisconnect } = useVueDapp()
const { setWallet, resetWallet } = useEthers()

watchWalletChanged(async wallet => {
	setWallet(wallet.provider)
})

watchDisconnect(() => {
	resetWallet()
})
</script>

<template>
	<div class="p-5">
		<div>historyStage: {{ historyStage }}</div>
		<div>stage: {{ stage }}</div>

		<div v-if="isConnected">
			<div>chainId: {{ wallet.chainId }}</div>
			<div>address: {{ wallet.address }}</div>
			<Button @click="disconnect">Disconnect</Button>
		</div>

		<div class="mt-5">
			<Button @click="onClickConnectButton">Connect Smart Account</Button>
		</div>

		<div class="mt-5">
			<Button @click="onClickConnectButton3">Connect Smart Account 3</Button>
		</div>

		<router-view></router-view>

		<VueDappModal dark auto-connect />
		<ModalsContainer />
	</div>
</template>

<style></style>
