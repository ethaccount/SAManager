<script setup lang="ts">
import { register, login } from '@/lib/passkey'

const username = ref('alice')

async function onClickRegister() {
	try {
		const res = await register(username.value)
		console.log('register', res)
	} catch (e) {
		console.error(e)
		alert(e)
	}
}

async function onClickLogin() {
	try {
		const res = await login()
		console.log('login', res)
	} catch (e) {
		console.error(e)
		alert(e)
	}
}
</script>

<template>
	<Input v-model="username" placeholder="Username" />
	<Button class="w-full" @click="onClickRegister">Register</Button>
	<Button class="w-full" @click="onClickLogin">Login</Button>
</template>

<style lang="css"></style>
