<script setup lang="ts">
import { usePasskey } from '@/stores/usePasskey'

type PasskeyMode = 'register' | 'login' | 'both'

const props = defineProps<{
	mode?: PasskeyMode
}>()

const emit = defineEmits(['confirm'])

const username = ref('ethaccount-demo')

const { passkeyRegister, passkeyLogin, isLogin } = usePasskey()

const loadingRegister = ref(false)
const loadingLogin = ref(false)
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
		await passkeyRegister(username.value)
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
		await passkeyLogin(username.value)
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
	emit('confirm')
}

function onClickLogout() {
	const { passkeyLogout } = usePasskey()
	passkeyLogout()
}
</script>

<template>
	<div class="flex flex-col gap-4 p-4 max-w-md mx-auto">
		<div v-if="!isLogin" class="flex flex-col gap-3">
			<div class="space-y-2">
				<label for="username" class="text-sm font-medium text-muted-foreground">Username</label>
				<Input
					id="username"
					v-model="username"
					placeholder="Enter username"
					class="w-full bg-background border-input"
				/>
			</div>

			<div class="grid gap-2">
				<Button
					v-if="showRegister"
					class="auth-button"
					:disabled="loadingRegister"
					:class="{ 'opacity-50 cursor-not-allowed': loadingRegister }"
					@click="onClickRegister"
				>
					<span v-if="loadingRegister" class="animate-spin mr-2">⟳</span>
					{{ effectiveMode === 'both' ? 'Register with Passkey' : 'Continue with Passkey' }}
				</Button>

				<template v-if="showLogin && showRegister">
					<div class="relative my-2">
						<div class="absolute inset-0 flex items-center">
							<span class="w-full border-t" />
						</div>
						<div class="relative flex justify-center text-xs uppercase">
							<span class="bg-background px-2 text-muted-foreground">or</span>
						</div>
					</div>
				</template>

				<Button
					v-if="showLogin"
					class="auth-button"
					:disabled="loadingLogin"
					:class="{ 'opacity-50 cursor-not-allowed': loadingLogin }"
					@click="onClickLogin"
				>
					<span v-if="loadingLogin" class="animate-spin mr-2">⟳</span>
					{{ effectiveMode === 'both' ? 'Login with Passkey' : 'Continue with Passkey' }}
				</Button>
			</div>
		</div>

		<div v-else class="flex flex-col gap-3">
			<div class="p-4 bg-secondary rounded-[--radius] border">
				<div class="flex items-center gap-2 text-foreground mb-2">
					<span>✓</span>
					<span>Successfully authenticated</span>
				</div>
				<p class="text-sm text-muted-foreground">
					Logged in as <span class="font-medium text-foreground">{{ username }}</span>
				</p>
			</div>

			<div class="grid gap-2">
				<Button @click="onClickConfirm" class="bg-primary text-primary-foreground hover:bg-primary/90">
					Confirm
				</Button>
				<Button
					@click="onClickLogout"
					variant="outline"
					class="border-input hover:bg-accent hover:text-accent-foreground"
				>
					Logout
				</Button>
			</div>
		</div>

		<p v-if="error" class="mt-2 p-3 bg-destructive/10 text-destructive rounded-[--radius] text-sm">
			⚠️ {{ error }}
		</p>
	</div>
</template>

<style lang="css" scoped>
.auth-button {
	@apply flex items-center justify-center p-4 bg-card text-card-foreground rounded-[--radius] border;
	@apply hover:bg-accent hover:text-accent-foreground transition-colors;
}
</style>
