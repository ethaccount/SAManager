<script setup lang="ts">
const onConfirm = () => {
	console.log('confirm')
}
</script>

<template>
	<div class="flex gap-4 flex-wrap">
		<div class="w-[420px] min-h-[390px] border border-border rounded-lg p-4">
			<ConnectEOAWallet @confirm="onConfirm" />
		</div>

		<div class="w-[420px] min-h-[390px] border border-border rounded-lg p-4">
			<p class="text-sm text-muted-foreground">Login and register</p>
			<ConnectPasskey @confirm="onConfirm" />
		</div>

		<div class="w-[420px] min-h-[390px] border border-border rounded-lg p-4">
			<p class="text-sm text-muted-foreground">Register only</p>
			<ConnectPasskey mode="register" @confirm="onConfirm" />
		</div>

		<div class="w-[420px] min-h-[390px] border border-border rounded-lg p-4">
			<p class="text-sm text-muted-foreground">Login only</p>
			<ConnectPasskey mode="login" @confirm="onConfirm" />
		</div>
	</div>
</template>

<style lang="css" scoped></style>
