<script setup lang="ts">
import { usePasskeyNoRp } from '@/stores/passkey/usePasskeyNoRp'
import { Loader2 } from 'lucide-vue-next'

type PasskeyMode = 'register' | 'login' | 'both'

const props = defineProps<{
	mode?: PasskeyMode
}>()

const emit = defineEmits(['confirm'])

const { createPasskey, connectPasskey, isPasskeySelected, selectedCredentialId } = usePasskeyNoRp()

const loadingRegister = ref(false)
const loadingLogin = ref(false)
const loadingRegisterOrLogin = computed(() => loadingRegister.value || loadingLogin.value)

const error = ref('')

// Compute effective mode, fallback to legacy prop
const effectiveMode = computed(() => {
	return props.mode || 'both'
})

const showRegister = computed(() => ['register', 'both'].includes(effectiveMode.value))
const showLogin = computed(() => ['login', 'both'].includes(effectiveMode.value))

async function onClickRegister() {
	error.value = ''
	loadingRegister.value = true
	try {
		await createPasskey()
	} catch (err: unknown) {
		if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
			error.value = 'Failed to connect to passkey server'
			return
		}
		if (err instanceof Error) {
			if (err.name === 'NotAllowedError') {
				return
			}
			error.value = err.message
		} else {
			error.value = 'An unknown error occurred'
		}
	} finally {
		loadingRegister.value = false
	}
}

async function onClickLogin() {
	error.value = ''
	loadingLogin.value = true
	try {
		await connectPasskey()
	} catch (err: unknown) {
		if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
			error.value = 'Failed to connect to passkey server'
			return
		}
		if (err instanceof Error) {
			if (err.name === 'NotAllowedError') {
				return
			}
			error.value = err.message
		} else {
			error.value = 'An unknown error occurred'
		}
	} finally {
		loadingLogin.value = false
	}
}

function onClickConfirm() {
	if (!isPasskeySelected.value) throw new Error('onClickConfirm: No passkey credential found')
	emit('confirm')
}
</script>

<template>
	<div class="flex flex-col gap-4 p-4">
		<!-- show selected credentail ID -->
		<div v-if="isPasskeySelected" class="flex flex-col gap-3 text-center">
			<p class="text-sm text-muted-foreground">Credential ID</p>
			<p class="text-sm text-muted-foreground break-all">{{ selectedCredentialId }}</p>
		</div>

		<div class="flex flex-col gap-3">
			<div class="grid grid-cols-2 gap-2">
				<Button
					v-if="showRegister"
					variant="secondary"
					:disabled="loadingRegisterOrLogin"
					:class="{ 'opacity-50 cursor-not-allowed': loadingRegisterOrLogin }"
					@click="onClickRegister"
				>
					<Loader2 v-if="loadingRegister" class="mr-2 h-4 w-4 animate-spin" />
					{{ 'Create Passkey' }}
				</Button>

				<Button
					v-if="showLogin"
					variant="secondary"
					:disabled="loadingRegisterOrLogin"
					:class="{ 'opacity-50 cursor-not-allowed': loadingRegisterOrLogin }"
					@click="onClickLogin"
				>
					<Loader2 v-if="loadingLogin" class="mr-2 h-4 w-4 animate-spin" />
					{{ 'Select Passkey' }}
				</Button>

				<Button
					v-if="isPasskeySelected"
					@click="onClickConfirm"
					variant="default"
					:disabled="!isPasskeySelected"
				>
					Confirm
				</Button>
			</div>
		</div>

		<p v-if="error" class="error-section">{{ error }}</p>
	</div>
</template>

<style lang="css" scoped></style>
