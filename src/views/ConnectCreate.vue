<script setup lang="ts">
const router = useRouter()

function onCreated() {
	router.back()
}
</script>

<template>
	<CreateUI @created="onCreated" />
</template>

<style lang="css" scoped></style>
