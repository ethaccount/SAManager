<script lang="ts" setup>
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import { ModalsContainer, useModal } from 'vue-final-modal'
// import { useColorMode } from '@vueuse/core'
import { useConnectModal } from '@/stores/useConnectModal'
import { VueDappModal } from '@vue-dapp/modal'
import '@vue-dapp/modal/dist/style.css'
import { useSA } from '@/stores/useSA'
import { useBlockchain } from '@/stores/useBlockchain'
import { useEOA } from '@/stores/useEOA'
import ConnectModal from '@/components/connect-modal/ConnectModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import { useErrorModalStore } from '@/stores/useErrorModal'
import Address from '@/components/Address.vue'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { X } from 'lucide-vue-next'

// ============================== Connect Modal ==============================
const connectModalStore = useConnectModal()
const { open: openConnectModal, close: closeConnectModal } = useModal({
	component: ConnectModal,
	attrs: {
		onClose: () => closeConnectModal(),
	},
	slots: {},
})

connectModalStore.updateStore({
	openModal: openConnectModal,
	closeModal: closeConnectModal,
})

function onClickConnectButton() {
	openConnectModal()
	connectModalStore.goNextStage()
}

// =============================== Error Modal ===============================
const errorModalStore = useErrorModalStore()
const { open: openErrorModal, close: closeErrorModal } = useModal({
	component: ErrorModal,
	attrs: {},
	slots: {},
})

errorModalStore.initOpenAndCloseFn(openErrorModal, closeErrorModal)

// =============================== DEV ===============================

// import { simulateStage, ConnectModalStageKey } from '@/stores/useConnectModal'
import { CHAIN_ID, CHAIN_NAME, ERROR_NOTIFICATION_DURATION, PASSKEY_RP_URL } from './config'
import { notify } from '@kyvg/vue3-notification'

// simulateStage(ConnectModalStageKey.CREATE_CONNECTED)
// simulateStage(ConnectModalStageKey.EOA_ACCOUNT_CHOICE)

// ============================== Vue Dapp ==============================

const { addConnectors, watchWalletChanged, watchDisconnect } = useVueDapp()

addConnectors([new BrowserWalletConnector()])

const { setWallet, resetWallet } = useEOA()

watchWalletChanged(async wallet => {
	setWallet(wallet.provider)
})

watchDisconnect(() => {
	resetWallet()
})

// ============================== Blockchain ==============================

const { chainId, chainIds } = useBlockchain()
const { account, resetAccount, isConnected } = useSA()

function onClickDisconnect() {
	resetAccount()
}

const router = useRouter()

const breakpoints = useBreakpoints(breakpointsTailwind)

// check passkey rp health
async function checkPasskeyRPHealth(): Promise<boolean> {
	try {
		const baseUrl = new URL(PASSKEY_RP_URL).origin
		const healthUrl = baseUrl + '/health'
		console.log('checking passkey rp health on', healthUrl)
		const response = await fetch(healthUrl)
		const data = await response.json()
		return data.status === 'ok'
	} catch (error: unknown) {
		console.error('Passkey RP health check failed:', error)
		if (error instanceof Error) {
			notify({
				title: 'Passkey RP health check failed',
				text: error.message,
				type: 'error',
				duration: ERROR_NOTIFICATION_DURATION,
			})
		}
		return false
	}
}

onMounted(async () => {
	const isHealthy = await checkPasskeyRPHealth()
	if (isHealthy) {
		console.log('Passkey RP service is healthy')
	}
})
</script>

<template>
	<div>
		<div class="p-5 flex flex-col gap-2">
			<div>
				<Select v-model="chainId">
					<SelectTrigger class="w-[120px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem v-for="id in chainIds" :value="id" :key="id">
								{{ CHAIN_NAME[id] }}
							</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>

				<div class="mt-2" v-if="isConnected">
					<div>
						address:
						<Address :address="account?.address" />
					</div>
					<div>chainId: {{ account?.chainId }}</div>
					<div>validator: {{ account?.validator }}</div>
					<div>accountId: {{ account?.accountId }}</div>
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
					>
						Send
					</Button>
					<Button
						variant="link"
						:class="{ underline: router.currentRoute.value.path === '/modules' }"
						@click="router.push('/modules')"
					>
						Modules
					</Button>
				</div>

				<router-view></router-view>
			</div>
		</div>

		<FooterMeta />
	</div>

	<VueDappModal dark auto-connect />
	<ModalsContainer />
	<Notifications
		class="break-words"
		:closeOnClick="false"
		:position="breakpoints.isSmaller('md') ? 'bottom center' : 'bottom right'"
	>
		<template #body="{ item, close }">
			<div class="vue-notification" :class="[item.type]">
				<div v-if="item.title" class="notification-title flex items-center justify-between">
					{{ item.title }}

					<X :size="16" class="cursor-pointer text-gray-200 hover:text-white" @click="close" />
				</div>
				<div class="notification-content">{{ item.text }}</div>
			</div>
		</template>
	</Notifications>
</template>

<style></style>
