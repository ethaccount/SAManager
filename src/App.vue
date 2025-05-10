<script lang="ts" setup>
import { useChainIdRoute } from '@/app/useChainIdRoute'
import { useValidation } from '@/stores/validation/useValidation'
import { VueDappModal } from '@vue-dapp/modal'
import { onMounted } from 'vue'
import { ModalsContainer } from 'vue-final-modal'
import { toast, Toaster } from 'vue-sonner'
import { useSetupVueDapp } from './app/useSetupVueDapp'
import { IS_DEV } from './config'
import { usePasskey } from './stores/passkey/usePasskey'
import { useEOAWallet } from './stores/useEOAWallet'

const { isEOAWalletConnected } = useEOAWallet()
const { isLogin } = usePasskey()
const { selectSigner } = useValidation()

useChainIdRoute()
useSetupVueDapp()

onMounted(async () => {
	if (!IS_DEV) {
		toast.info('Under Construction', {
			description: 'This website is actively developed',
			duration: 5000,
		})
	}
})

// Auto-select single signer when connected
watchImmediate([isEOAWalletConnected, isLogin], ([eoaConnected, passkeyConnected]) => {
	if (eoaConnected && !passkeyConnected) {
		selectSigner('EOA-Owned')
	} else if (!eoaConnected && passkeyConnected) {
		selectSigner('Passkey')
	} else if (eoaConnected && passkeyConnected) {
		selectSigner('Passkey')
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
