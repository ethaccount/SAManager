<script setup lang="ts">
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useConnectModal } from '@/stores/useConnectModal'
const username = ref('ethaccount-demo')

const { passkeyRegister, passkeyLogin, isLogin } = usePasskey()

const loadingRegister = ref(false)
const loadingLogin = ref(false)

async function onClickRegister() {
	loadingRegister.value = true
	try {
		await passkeyRegister(username.value)
	} catch (error: unknown) {
		if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
			throw new Error('Failed to connect to passkey server')
		}
		if (error instanceof Error && error.name === 'NotAllowedError') {
			return
		}
		throw error
	} finally {
		loadingRegister.value = false
	}
}

async function onClickLogin() {
	loadingLogin.value = true
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
		loadingLogin.value = false
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
		<Button class="w-full" :disabled="loadingRegister" :loading="loadingRegister" @click="onClickRegister">
			Register
		</Button>
		<p class="text-center">or</p>
		<Button class="w-full" :disabled="loadingLogin" :loading="loadingLogin" @click="onClickLogin">Login</Button>
	</div>
	<div v-else>
		<p class="text-center">Username: {{ username }}</p>
		<Button class="w-full" @click="onClickLogout">Logout</Button>
		<Button class="w-full" @click="onClickNext">Next</Button>
	</div>
</template>

<style lang="css"></style>
