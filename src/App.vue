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
import { shortenAddress } from '@vue-dapp/core'
// ============================== Connect Modal ==============================
const { goNextStage, updateStore } = useConnectModal()
const { open: openConnectModal, close: closeConnectModal } = useModal({
	component: ConnectModal,
	attrs: {
		onClose: () => closeConnectModal(),
	},
	slots: {},
})

updateStore({
	openModal: openConnectModal,
	closeModal: closeConnectModal,
})

function onClickConnectButton() {
	openConnectModal()
	goNextStage()
}

// =============================== DEV ===============================

import { simulateStage, ConnectModalStageKey } from '@/stores/useConnectModal'
import { CHAIN_ID, CHAIN_NAME } from './config'

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

const router = useRouter()
</script>

<template>
	<div class="p-5 flex flex-col gap-2">
		<div>
			<Select v-model="chainId">
				<SelectTrigger class="w-[120px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectItem v-for="id in CHAIN_ID" :value="id"> {{ CHAIN_NAME[id] }} </SelectItem>
					</SelectGroup>
				</SelectContent>
			</Select>

			<div class="mt-2" v-if="isConnected">
				<div>address: {{ account?.address && shortenAddress(account.address) }}</div>
				<div>chainId: {{ account?.chainId }}</div>
				<div>validator: {{ account?.validator }}</div>
				<div>vendor: {{ account?.vendor }}</div>
			</div>
		</div>

		<div>
			<Button v-if="!isConnected" @click="onClickConnectButton">Connect Smart Account</Button>
			<Button v-else @click="onClickDisconnect">Disconnect</Button>
		</div>

		<div v-if="isConnected">
			<div class="flex justify-center gap-2">
				<Button
					variant="link"
					:class="{ underline: router.currentRoute.value.path === '/' }"
					@click="router.push('/')"
					>Modules</Button
				>
				<Button
					variant="link"
					:class="{ underline: router.currentRoute.value.path === '/send' }"
					@click="router.push('/send')"
					>Send</Button
				>
			</div>

			<router-view></router-view>
		</div>
	</div>
	<VueDappModal dark auto-connect />
	<ModalsContainer />
</template>

<style></style>
