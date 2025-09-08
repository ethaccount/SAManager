<script setup lang="ts">
import { toRoute } from '@/lib/router'

const router = useRouter()

function onCreated(address: string) {
	router.push(toRoute('account-settings', { address }))
}
</script>

<template>
	<CreateUI @created="onCreated" />
</template>

<style lang="css" scoped></style>
