<script lang="ts" setup>
import { useChainIdRoute } from '@/app/useChainIdRoute'
import ErrorModal from '@/components/ErrorModal.vue'
import { useErrorModalStore } from '@/stores/useErrorModal'
import { VueDappModal } from '@vue-dapp/modal'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { X } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { ModalsContainer, useModal } from 'vue-final-modal'
import { useSetupVueDapp } from './app/useSetupVueDapp'
import { ERROR_NOTIFICATION_DURATION, IS_DEV, PASSKEY_RP_URL } from './config'

useChainIdRoute()
useSetupVueDapp()

onMounted(async () => {
	// check passkey rp health in production
	if (!IS_DEV) {
		const isHealthy = await checkPasskeyRPHealth()
		if (isHealthy) {
			console.log('Passkey RP service is healthy')
		}
	}
})

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
import { notify } from '@kyvg/vue3-notification'

// ============================== Blockchain ==============================

// const { account, resetAccount, isConnected } = useSA()

// function onClickDisconnect() {
// 	resetAccount()
// }

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
</script>

<template>
	<div class="">
		<Header />
		<main class="container flex-1 pt-14 pb-5">
			<router-view />
		</main>

		<ThemeToggle class="fixed bottom-4 left-4" />
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

<style>
.container {
	@apply mx-auto w-full max-w-[1200px] px-4;
}
</style>
