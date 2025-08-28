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
import { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from './config'
import { makeFatalError } from './lib/error'
import { useAccount } from './stores/account/useAccount'
import { useBlockchain } from './stores/blockchain'
import { useBackend } from './stores/useBackend'
import { useStorageMigration } from './stores/useStorageMigration'

const route = useRoute()

const { selectedChainId } = useBlockchain()
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

	// reset selectedChainId when it is not supported because it may be stored in localStorage
	if (!SUPPORTED_CHAIN_IDS.includes(selectedChainId.value)) {
		selectedChainId.value = DEFAULT_CHAIN_ID
	}

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
</script>

<template>
	<div v-if="route.name === 'connect'">
		<RouterView />
	</div>

	<div v-else>
		<Header />
		<MainLayout />
	</div>

	<AppHelp v-if="route.name !== 'browser' && route.name !== 'connect'" class="fixed bottom-4 left-4" />

	<VueDappModal :dark="mode === 'dark'" autoConnect />
	<ModalsContainer />
	<Toaster :theme="mode === 'dark' ? 'light' : 'dark'" position="top-center" closeButton />
</template>

<style></style>
