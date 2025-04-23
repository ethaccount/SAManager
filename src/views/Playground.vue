<script setup>
import BottomSheet from '@douxcode/vue-spring-bottom-sheet'
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
	<BottomSheet ref="bottomSheet">
		<template #header> Header </template>
		<div class="">
			<div>Your content</div>

			Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet
			consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit.
			Quisquam, quos.
		</div>
		<template #footer> Footer </template>
	</BottomSheet>
</template>

<style lang="css"></style>
