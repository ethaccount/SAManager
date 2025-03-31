<script setup lang="ts">
import { usePasskey } from '@/stores/usePasskey'
import { useConnectModal } from '@/stores/useConnectModal'

const username = ref('ethaccount-demo')

const { passkeyLogin, isLogin } = usePasskey()

const loading = ref(false)

async function onClickLogin() {
	loading.value = true
	try {
		await passkeyLogin(username.value)
	} catch (error: unknown) {
		if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
			throw new Error('Failed to connect to passkey server')
		}
		if (error instanceof Error && error.name === 'NotAllowedError') {
			return
		}
		throw error
	} finally {
		loading.value = false
	}
}

function onClickNext() {
	const { goNextStage } = useConnectModal()
	goNextStage()
}

function onClickLogout() {
	const { passkeyLogout } = usePasskey()
	passkeyLogout()
}
</script>

<template>
	<div v-if="!isLogin">
		<Input v-model="username" placeholder="Username" />
		<Button class="w-full" :disabled="loading" :loading="loading" @click="onClickLogin">Login</Button>
	</div>
	<div v-else>
		<p class="text-center">Username: {{ username }}</p>
		<Button class="w-full" @click="onClickLogout">Logout</Button>
		<Button class="w-full" @click="onClickNext">Next</Button>
	</div>
</template>

<style lang="css"></style>
