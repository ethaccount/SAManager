<script lang="ts" setup>
import { useChainIdRoute } from '@/app/useChainIdRoute'
import { useSetupAccount } from '@/app/useSetupAccount'
import { useSetupPasskey } from '@/app/useSetupPasskey'
import { useSetupVueDapp } from '@/app/useSetupVueDapp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useSigner } from '@/stores/validation/useSigner'
import { VueDappModal } from '@vue-dapp/modal'
import { ModalsContainer } from 'vue-final-modal'
import { Toaster } from 'vue-sonner'
import { useSetupEnv } from '@/app/useSetupEnv'

const { isEOAWalletConnected } = useEOAWallet()
const { isLogin } = usePasskey()
const { selectSigner } = useSigner()

useChainIdRoute()
useSetupVueDapp()
useSetupAccount()
useSetupPasskey()
useSetupEnv()

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
