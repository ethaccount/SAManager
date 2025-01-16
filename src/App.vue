<script lang="ts" setup>
import { CoinbaseWalletConnector } from '@vue-dapp/coinbase'
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import { ModalsContainer, useModal } from 'vue-final-modal'
import ConnectModal from './components/connect_modal/ConnectModal.vue'
// import { useColorMode } from '@vueuse/core'
import { VueDappModal } from '@vue-dapp/modal'
import '@vue-dapp/modal/dist/style.css'
import { useApp } from './stores/app'
import { useConnectModal } from './stores/connect_modal'
import { useEthers } from './stores/ethers'

// ============================== Vue Dapp ==============================

const { addConnectors, watchWalletChanged, watchDisconnect } = useVueDapp()

addConnectors([
	new BrowserWalletConnector(),
	new CoinbaseWalletConnector({
		appName: 'Vue Dapp',
		jsonRpcUrl: 'https://ethereum-rpc.publicnode.com',
	}),
])

const { setWallet, resetWallet } = useEthers()

watchWalletChanged(async wallet => {
	setWallet(wallet.provider)
})

watchDisconnect(() => {
	resetWallet()
})

// ============================== Connect Modal ==============================

const { stateHistory, goNextState, currentState } = useConnectModal()

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

function onClickConnectButton() {
	open()
	goNextState()
}

// ============================== App ==============================

const { chainId } = useApp()
</script>

<template>
	<div class="p-5 flex flex-col gap-2">
		<div>
			<div>currentState: {{ currentState }}</div>
			<div>stateHistory: {{ stateHistory }}</div>
			<div>app chainId: {{ chainId }}</div>
		</div>

		<div>
			<Button @click="onClickConnectButton">Connect Smart Account</Button>
		</div>

		<div>
			<router-view></router-view>
		</div>
	</div>
	<VueDappModal dark auto-connect />
	<ModalsContainer />
</template>

<style></style>
