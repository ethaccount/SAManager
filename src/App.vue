<script lang="ts" setup>
import { CoinbaseWalletConnector } from '@vue-dapp/coinbase'
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import { ModalsContainer, useModal } from 'vue-final-modal'
// import { useColorMode } from '@vueuse/core'
import { useConnectModal } from '@/stores/useConnectModal'
import { VueDappModal } from '@vue-dapp/modal'
import '@vue-dapp/modal/dist/style.css'
import { useAccount } from './stores/account'
import { useApp } from './stores/app'
import { useEthers } from './stores/ethers'
import ConnectModal from '@/components/connect_modal/ConnectModal.vue'

// ============================== Connect Modal ==============================
const { goNextStage } = useConnectModal()
const { open, close } = useModal({
	component: ConnectModal,
	attrs: {
		onClose: () => close(),
	},
	slots: {},
})

function onClickConnectButton() {
	open()
	goNextStage()
}

// =============================== DEV ===============================

// import { simulateStage, ConnectModalStageKey } from '@/stores/useConnectModal'
// open()
// simulateStage(ConnectModalStageKey.CREATE_CONNECTED)
// simulateStage(ConnectModalStageKey.EOA_ACCOUNT_CHOICE)

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

// ============================== App ==============================

const { chainId } = useApp()
const { account, resetAccount, isConnected } = useAccount()

function onClickDisconnect() {
	resetAccount()
}
</script>

<template>
	<div class="p-5 flex flex-col gap-2">
		<div>
			<div>app chainId: {{ chainId }}</div>
			<div>account: {{ account }}</div>
		</div>

		<div>
			<Button v-if="!isConnected" @click="onClickConnectButton">Connect Smart Account</Button>
			<Button v-else @click="onClickDisconnect">Disconnect</Button>
		</div>

		<div>
			<router-view></router-view>
		</div>
	</div>
	<VueDappModal dark auto-connect />
	<ModalsContainer />
</template>

<style></style>
