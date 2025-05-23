<script lang="ts" setup>
import { useChainIdRoute } from '@/app/useChainIdRoute'
import { useSigner } from '@/stores/validation/useSigner'
import { VueDappModal } from '@vue-dapp/modal'
import { onMounted } from 'vue'
import { ModalsContainer } from 'vue-final-modal'
import { toast, Toaster } from 'vue-sonner'
import { useSetupAccount } from './app/useSetupAccount'
import { useSetupVueDapp } from './app/useSetupVueDapp'
import { IS_DEV } from './config'
import { usePasskey } from './stores/passkey/usePasskey'
import { useEOAWallet } from './stores/useEOAWallet'

const { isEOAWalletConnected } = useEOAWallet()
const { isLogin } = usePasskey()
const { selectSigner } = useSigner()

useChainIdRoute()
useSetupVueDapp()
useSetupAccount()

onMounted(async () => {
	if (!IS_DEV) {
		toast.info('Under Construction', {
			description: 'This website is actively developed',
			duration: 5000,
		})
	}
})

// Auto-select signer when connected
watchImmediate([isEOAWalletConnected, isLogin], ([eoaWalletConnected, passkeyConnected]) => {
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

	<AppHelp class="fixed bottom-4 left-4" />

	<VueDappModal :dark="mode === 'dark'" autoConnect />
	<ModalsContainer />
	<Toaster :theme="mode === 'dark' ? 'light' : 'dark'" position="top-center" closeButton />
</template>

<style></style>
