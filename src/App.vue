<script lang="ts" setup>
import { useChainIdRoute } from '@/app/useChainIdRoute'
import { VueDappModal } from '@vue-dapp/modal'
import { useColorMode } from '@vueuse/core'
import { onMounted } from 'vue'
import { ModalsContainer } from 'vue-final-modal'
import { toast, Toaster } from 'vue-sonner'
import { useSetupVueDapp } from './app/useSetupVueDapp'
import { IS_DEV } from './config'

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

const mode = useColorMode()
</script>

<template>
	<Header />
	<MainLayout />

	<ThemeToggle class="fixed bottom-4 left-4" />

	<VueDappModal :dark="mode === 'dark'" />
	<ModalsContainer />
	<Toaster :theme="mode === 'dark' ? 'light' : 'dark'" position="top-center" closeButton />
</template>

<style></style>
