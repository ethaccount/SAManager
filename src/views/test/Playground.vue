<script setup>
import { toast } from 'vue-sonner'

const bottomSheet = ref(null)

const open = () => {
	bottomSheet.value.open()
}

const close = () => {
	bottomSheet.value.close()
}

const promise = () => new Promise(resolve => setTimeout(resolve, 2000))

toast.promise(promise, {
	loading: 'Loading...',
	success: data => {
		return `${data.name} toast has been added`
	},
	error: data => 'Error',
})

toast.info('hello', {
	description: 'world',
})
</script>

<template>
	<Button @click="open">Open</Button>
</template>

<style lang="css"></style>
