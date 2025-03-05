<script setup lang="ts">
function onClickRegister() {
	console.log('onClickRegister')
}

function onClickLogin() {
	console.log('onClickLogin')
}
</script>

<template>
	<Button class="w-full" @click="onClickRegister">Register</Button>
	<Button class="w-full" @click="onClickLogin">Login</Button>
</template>

<style lang="css"></style>
