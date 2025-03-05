<script setup lang="ts">
import { usePasskey } from '@/stores/usePasskey'

const username = ref('alice')

const { passkeyRegister, passkeyLogin, isLogin, credential } = usePasskey()

async function onClickRegister() {
	await passkeyRegister(username.value)
}

async function onClickLogin() {
	await passkeyLogin(username.value)
}
</script>

<template>
	<div v-if="!isLogin">
		<Input v-model="username" placeholder="Username" />
		<Button class="w-full" @click="onClickRegister">Register</Button>
		<Button class="w-full" @click="onClickLogin">Login</Button>
	</div>
	<div v-else>
		<p>Username: {{ username }}</p>
	</div>
</template>

<style lang="css"></style>
