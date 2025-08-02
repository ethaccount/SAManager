<script lang="ts" setup>
import { useChainIdRoute } from '@/app/useChainIdRoute'
import { useCrossChainAutoImport } from '@/app/useCrossChainAutoImport'
import { env, useSetupEnv } from '@/app/useSetupEnv'
import { useSetupPasskey } from '@/app/useSetupPasskey'
import { useSetupVueDapp } from '@/app/useSetupVueDapp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/useSigner'
import { VueDappModal } from '@vue-dapp/modal'
import { ModalsContainer } from 'vue-final-modal'
import { Toaster } from 'vue-sonner'
import { useAccount } from './stores/account/useAccount'
import { useBackend } from './stores/useBackend'

const route = useRoute()

const { isEOAWalletConnected } = useEOAWallet()
const { isLogin } = usePasskey()
const { selectSigner } = useSigner()

useChainIdRoute()
useSetupVueDapp()
useCrossChainAutoImport()

// NOTE: onMounted hooks are not guaranteed to execute in registration order
const { setupPasskey } = useSetupPasskey()
const { setupEnv } = useSetupEnv()

onMounted(async () => {
	await setupEnv()
	console.info('ENVIRONMENT', env.ENVIRONMENT)

	await checkBackendHealth()
	await setupPasskey()
})

const { checkBackendHealth } = useBackend()
const { accountVMethods } = useAccount()

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
	<Header />
	<MainLayout />

	<AppHelp v-if="route.name !== 'browser'" class="fixed bottom-4 left-4" />

	<VueDappModal :dark="mode === 'dark'" autoConnect />
	<ModalsContainer />
	<Toaster :theme="mode === 'dark' ? 'light' : 'dark'" position="top-center" closeButton />
</template>

<style></style>
