<script setup lang="ts">
import { announceSAManagerProvider, WalletGetCallsStatusResponse, WalletSendCallsResponse } from '@samanager/sdk'
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import { useVueDappModal, VueDappModal } from '@vue-dapp/modal'
import '@vue-dapp/modal/dist/style.css'

const { wallet, isConnected, connectors, addConnectors, watchWalletChanged, watchDisconnect, disconnect } = useVueDapp()

const DAPP_CHAIN_ID = 84532n

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

	onClickConnectButton()
})

watchWalletChanged(async wallet => {
	console.log('wallet', wallet)
})

watchDisconnect(() => {
	console.log('disconnect')
})

function onClickConnectButton() {
	if (isConnected.value) {
		disconnect()
	} else {
		useVueDappModal().open()
		// Auto-click SAManager after modal opens
		// nextTick(() => {
		// 	setTimeout(autoClickSAManager, 100) // Small delay to ensure modal is rendered
		// })
	}
}

const getBlockError = ref<string | null>(null)
const block = ref(null)
const sendCallsError = ref<string | null>(null)
const sendCallsResult = ref<WalletSendCallsResponse | null>(null)
const getCallsStatusError = ref<string | null>(null)
const getCallsStatusResult = ref<WalletGetCallsStatusResponse | null>(null)
const showCallsStatusError = ref<string | null>(null)
const showCallsStatusResult = ref(null)
const capabilitiesError = ref<string | null>(null)
const capabilitiesResult = ref(null)

async function onClickGetBlock() {
	getBlockError.value = null
	block.value = null
	if (wallet.status === 'connected' && wallet.provider) {
		try {
			block.value = await wallet.provider.request({
				method: 'eth_getBlockByNumber',
				params: ['latest', false],
			})
		} catch (err: unknown) {
			console.error('Error getting block', err)
			getBlockError.value =
				err && typeof err === 'object' && 'message' in err ? (err.message as string) : 'Unknown error'
		}
	} else {
		getBlockError.value = 'Wallet not connected'
	}
}

async function onClickGetCapabilities() {
	capabilitiesError.value = null
	capabilitiesResult.value = null
	if (wallet.status === 'connected' && wallet.provider && wallet.address) {
		try {
			capabilitiesResult.value = await wallet.provider.request({
				method: 'wallet_getCapabilities',
				params: [wallet.address, [`0x${DAPP_CHAIN_ID.toString(16)}`]],
			})
		} catch (err: unknown) {
			console.error('Error getting capabilities', err)
			capabilitiesError.value =
				err && typeof err === 'object' && 'message' in err ? (err.message as string) : 'Unknown error'
		}
	} else {
		capabilitiesError.value = 'Wallet not connected'
	}
}

async function onClickSendCalls() {
	sendCallsError.value = null
	sendCallsResult.value = null
	if (wallet.status === 'connected' && wallet.provider && wallet.address) {
		try {
			sendCallsResult.value = await wallet.provider.request({
				method: 'wallet_sendCalls',
				params: [
					{
						version: '1.0',
						chainId: `0x${DAPP_CHAIN_ID.toString(16)}`,
						from: wallet.address,
						atomicRequired: true,
						calls: [
							{
								to: '0x96e44D241D3A6B069C3DF4e69DE28Ea098805b18',
								value: '0x0',
								data: '0xd09de08a',
							},
						],
						capabilities: {},
					},
				],
			})
		} catch (err: unknown) {
			console.error('Error sending calls', err)
			sendCallsError.value =
				err && typeof err === 'object' && 'message' in err ? (err.message as string) : 'Unknown error'
		}
	} else {
		sendCallsError.value = 'Wallet not connected'
	}
}

async function onClickGetCallsStatus() {
	getCallsStatusError.value = null
	getCallsStatusResult.value = null
	if (wallet.status === 'connected' && wallet.provider && sendCallsResult.value) {
		try {
			getCallsStatusResult.value = await wallet.provider.request({
				method: 'wallet_getCallsStatus',
				params: [sendCallsResult.value.id],
			})
		} catch (err: unknown) {
			console.error('Error getting calls status', err)
			getCallsStatusError.value =
				err && typeof err === 'object' && 'message' in err ? (err.message as string) : 'Unknown error'
		}
	} else if (!sendCallsResult.value) {
		getCallsStatusError.value = 'No sendCalls result available'
	} else {
		getCallsStatusError.value = 'Wallet not connected'
	}
}

async function onClickShowCallsStatus() {
	showCallsStatusError.value = null
	showCallsStatusResult.value = null
	if (wallet.status === 'connected' && wallet.provider && sendCallsResult.value) {
		try {
			showCallsStatusResult.value = await wallet.provider.request({
				method: 'wallet_showCallsStatus',
				params: [sendCallsResult.value.id],
			})
		} catch (err: unknown) {
			console.error('Error showing calls status', err)
			showCallsStatusError.value =
				err && typeof err === 'object' && 'message' in err ? (err.message as string) : 'Unknown error'
		}
	} else if (!sendCallsResult.value) {
		showCallsStatusError.value = 'No sendCalls result available'
	} else {
		showCallsStatusError.value = 'Wallet not connected'
	}
}
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
			<div v-if="getBlockError" class="text-red-500">{{ getBlockError }}</div>
			<div v-if="block">
				<div>block: {{ (block as any).hash }}</div>
			</div>
		</div>

		<br />

		<div>
			<button class="btn" @click="onClickGetCapabilities">wallet_getCapabilities</button>
			<div v-if="capabilitiesError" class="text-red-500">{{ capabilitiesError }}</div>
			<div v-if="capabilitiesResult">
				<div>capabilities: {{ capabilitiesResult }}</div>
			</div>
		</div>

		<br />

		<div>
			<button class="btn" @click="onClickSendCalls">wallet_sendCalls</button>
			<div v-if="sendCallsError" class="text-red-500">{{ sendCallsError }}</div>
			<div v-if="sendCallsResult">
				<div>result: {{ sendCallsResult }}</div>
			</div>
		</div>

		<br />

		<div>
			<button class="btn" @click="onClickGetCallsStatus">wallet_getCallsStatus</button>
			<div v-if="getCallsStatusError" class="text-red-500">{{ getCallsStatusError }}</div>
			<div v-if="getCallsStatusResult">
				<div>status: {{ getCallsStatusResult.status }}</div>
				<div>receipts: {{ getCallsStatusResult.receipts }}</div>
			</div>
		</div>

		<br />

		<div>
			<button class="btn" @click="onClickShowCallsStatus">wallet_showCallsStatus</button>
			<div v-if="showCallsStatusError" class="text-red-500">{{ showCallsStatusError }}</div>
			<div v-if="showCallsStatusResult">
				<div>result: {{ showCallsStatusResult }}</div>
			</div>
		</div>

		<RouterView />
	</div>

	<VueDappModal dark auto-connect />
</template>

<style scoped></style>
