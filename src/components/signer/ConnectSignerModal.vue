<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { VueFinalModal } from 'vue-final-modal'

const props = withDefaults(
	defineProps<{
		type: 'eoa-wallet' | 'passkey-both' | 'passkey-only-register' | 'passkey-only-login'
	}>(),
	{
		type: 'eoa-wallet',
	},
)

const emit = defineEmits<{
	(e: 'connect'): void
	(e: 'close'): void
}>()

function onClickClose() {
	emit('close')
}

const title = computed(() => {
	switch (props.type) {
		case 'eoa-wallet':
			return 'Connect EOA Wallet'
		case 'passkey-both':
			return 'Connect Passkey'
		case 'passkey-only-register':
			return 'Register Passkey'
		case 'passkey-only-login':
			return 'Login Passkey'
		default:
			return 'Unknown'
	}
})
</script>

<template>
	<VueFinalModal
		class="connect-signer-modal"
		content-class="connect-signer-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="true"
		:esc-to-close="true"
	>
		<div class="flex justify-between items-center">
			<!-- go back button -->
			<div class="w-9"></div>

			<div>{{ title }}</div>

			<!-- close button -->
			<Button variant="ghost" size="icon" @click="onClickClose">
				<X class="w-4 h-4" />
			</Button>
		</div>

		<ConnectEOAWallet v-if="props.type === 'eoa-wallet'" @confirm="emit('close')" />
		<ConnectPasskey mode="both" v-if="props.type === 'passkey-both'" @confirm="emit('close')" />
		<ConnectPasskey mode="register" v-if="props.type === 'passkey-only-register'" @confirm="emit('close')" />
		<ConnectPasskey mode="login" v-if="props.type === 'passkey-only-login'" @confirm="emit('close')" />
	</VueFinalModal>
</template>

<style>
.connect-signer-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}
.connect-signer-modal-content {
	@apply border border-border bg-background p-6 mx-2;
	width: 420px;
	min-height: 390px;
	display: flex;
	flex-direction: column;
	border-radius: 0.5rem;
}
</style>
