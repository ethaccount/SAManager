<script lang="ts" setup>
import { useChainIdRoute } from '@/app/useChainIdRoute'
import { useMultichainAutoImport } from '@/app/useMultichainAutoImport'
import { useSetupVueDapp } from '@/app/useSetupVueDapp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useDisclaimerModal } from '@/stores/useDisclaimerModal'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/useSigner'
import { VueDappModal } from '@vue-dapp/modal'
import { ModalsContainer } from 'vue-final-modal'
import { Toaster } from 'vue-sonner'
import { makeFatalError } from './lib/error'
import { useAccount } from './stores/account/useAccount'
import { useBackend } from './stores/useBackend'
import { useStorageMigration } from './stores/useStorageMigration'
import { CircleX, CircleCheck } from 'lucide-vue-next'

const route = useRoute()

const { isEOAWalletConnected } = useEOAWallet()
const { isLogin, checkPasskeySupport } = usePasskey()
const { selectSigner } = useSigner()
const { showDisclaimerIfNeeded } = useDisclaimerModal()
const { checkBackendHealth } = useBackend()
const { accountVMethods } = useAccount()

const { runMigrations } = useStorageMigration()
runMigrations()

// NOTE: onMounted hooks are not guaranteed to execute in registration order
useChainIdRoute()
useSetupVueDapp()
useMultichainAutoImport()

onMounted(async () => {
	console.info('APP_SALT', APP_SALT)
	console.info('APP_SESSION_SIGNER_ADDRESS', APP_SESSION_SIGNER_ADDRESS)

	showDisclaimerIfNeeded()

	await checkPasskeySupport()
	await checkWorkerHealth()
	await checkBackendHealth() // This may take a while for cold start so put it last
})

async function checkWorkerHealth() {
	const workerHealth = await fetch('/health')
	const res = await workerHealth.json()
	if (res.status !== 'ok') {
		makeFatalError(`${res.error || 'Worker health check failed'}`)
		return
	}
}

// Auto-select signer when connected
watchImmediate([isEOAWalletConnected, isLogin], ([eoaWalletConnected, passkeyConnected]) => {
	// select the signer for selected account: passkey > eoa
	if (accountVMethods.value.length) {
		const passkeyMethod = accountVMethods.value.find(vMethod => vMethod.signerType === 'Passkey')
		if (passkeyMethod && passkeyConnected) {
			selectSigner('Passkey')
			return
		}
		const eoaMethod = accountVMethods.value.find(vMethod => vMethod.signerType === 'EOAWallet')
		if (eoaMethod && eoaWalletConnected) {
			selectSigner('EOAWallet')
			return
		}
	}
	if (eoaWalletConnected && !passkeyConnected) {
		selectSigner('EOAWallet')
	} else if (!eoaWalletConnected && passkeyConnected) {
		selectSigner('Passkey')
	} else if (eoaWalletConnected && passkeyConnected) {
		const { selectedSigner } = useSigner()
		if (!selectedSigner.value) {
			// if both are connected and doesn't have a selected signer, select the passkey
			selectSigner('Passkey')
		}
	}
})

const mode = useColorMode()

// Prefer window.location.pathname over route.name for layout control,
// as route.name's reactivity can lag and briefly render incorrect UI (header flicker)
const pathname = computed(() => window.location.pathname)
</script>

<template>
	<div>
		<div v-if="pathname.endsWith('/connect')">
			<RouterView />
		</div>
		<div v-else>
			<Header />
			<MainLayout />
		</div>
	</div>

	<AppHelp v-if="route.name !== 'browser' && route.name !== 'connect'" class="fixed bottom-4 left-4" />

	<VueDappModal :dark="mode === 'dark'" autoConnect />
	<ModalsContainer />
	<Toaster :theme="mode === 'dark' ? 'light' : 'dark'" position="top-center" closeButton>
		<template #error-icon>
			<CircleX class="text-red-600 w-[18px] h-[18px]" />
		</template>
		<template #success-icon>
			<CircleCheck class="text-green-600 w-[18px] h-[18px]" />
		</template>
	</Toaster>
</template>

<style>
/* Scrollable content */
[data-sonner-toast] [data-content] {
	max-height: 200px;
	overflow-y: auto;
	padding-right: 4px;
}

/* Align icon to the top */
[data-sonner-toast][data-styled='true'] {
	align-items: flex-start;
}

[data-sonner-toast][data-styled='true'] [data-icon] {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 18px;
	height: 18px;
	margin: 0;
}

/* Disable lift animation */
[data-sonner-toast] {
	--lift: 0;
	--lift-amount: 0;
}
</style>
