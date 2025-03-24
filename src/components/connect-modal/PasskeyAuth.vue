<script setup lang="ts">
import { usePasskey } from '@/stores/usePasskey'
import { useConnectModal } from '@/stores/useConnectModal'
const username = ref('ethaccount-demo')

const { passkeyRegister, passkeyLogin, isLogin, credential } = usePasskey()

async function onClickRegister() {
	await passkeyRegister(username.value)
}

async function onClickLogin() {
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
	}
}

function onClickNext() {
	const { goNextStage } = useConnectModal()
	goNextStage()
}
</script>

<template>
	<div v-if="!isLogin">
		<Input v-model="username" placeholder="Username" />
		<Button class="w-full" @click="onClickRegister">Register</Button>
		<p class="text-center">or</p>
		<Button class="w-full" @click="onClickLogin">Login</Button>
	</div>
	<div v-else>
		<p class="text-center">Username: {{ username }}</p>
		<Button class="w-full" @click="onClickNext">Next</Button>
	</div>
</template>

<style lang="css"></style>
