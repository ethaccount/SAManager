<script setup lang="ts">
import { usePasskey } from '@/stores/passkey/usePasskey'
import { Loader2 } from 'lucide-vue-next'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'

type PasskeyMode = 'register' | 'login' | 'both'

const props = defineProps<{
	mode?: PasskeyMode
}>()

const emit = defineEmits(['confirm'])

// @docs https://github.com/andreasonny83/unique-names-generator
const randomName = uniqueNamesGenerator({
	dictionaries: [adjectives, animals],
	length: 2,
	separator: '-',
})

const USERNAME_PREFIX = 'SAManager-'
const username = ref(randomName)
const displayUsername = computed(() => USERNAME_PREFIX + username.value)
const isRegistrationMode = ref(false)

const { passkeyRegister, passkeyLogin, isLogin, isPasskeyRPHealthy } = usePasskey()

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

function onClickStartRegister() {
	isRegistrationMode.value = true
}

function onClickBack() {
	isRegistrationMode.value = false
	error.value = ''
}

async function onClickRegister() {
	error.value = ''
	loadingRegister.value = true
	try {
		await passkeyRegister(displayUsername.value)
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
		await passkeyLogin()
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
	if (!isLogin.value) throw new Error('onClickConfirm: No passkey credential found')
	emit('confirm')
}

function onClickLogout() {
	usePasskey().resetCredentialId()
}
</script>

<template>
	<div class="flex flex-col gap-4 p-4">
		<!-- <p v-if="!isPasskeyRPHealthy" class="p-3 bg-destructive/10 text-destructive rounded-[--radius] text-sm">
			Passkey server is not responding. Please try again later.
		</p> -->

		<div v-if="!isLogin" class="flex flex-col gap-3">
			<!-- Level 1: Initial Selection -->
			<div v-if="!isRegistrationMode" class="grid grid-cols-2 gap-2">
				<Button
					v-if="showRegister"
					variant="secondary"
					:disabled="loadingRegisterOrLogin"
					:class="{ 'opacity-50 cursor-not-allowed': loadingRegisterOrLogin }"
					@click="onClickStartRegister"
				>
					Create Account
				</Button>

				<Button
					v-if="showLogin"
					variant="default"
					:disabled="loadingRegisterOrLogin"
					:class="{ 'opacity-50 cursor-not-allowed': loadingRegisterOrLogin }"
					@click="onClickLogin"
				>
					<Loader2 v-if="loadingLogin" class="mr-2 h-4 w-4 animate-spin" />
					Login
				</Button>
			</div>

			<!-- Level 2: Registration -->
			<div v-else class="flex flex-col gap-3">
				<div class="space-y-2">
					<label for="username" class="text-sm font-medium text-muted-foreground">Username</label>
					<div class="relative">
						<div
							class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground"
						>
							{{ USERNAME_PREFIX }}
						</div>
						<Input
							id="username"
							v-model="username"
							placeholder="Enter username"
							class="w-full bg-background border-input pl-[105px]"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<Button variant="outline" @click="onClickBack" :disabled="loadingRegister"> Back </Button>

					<Button
						variant="default"
						:disabled="loadingRegister"
						:class="{ 'opacity-50 cursor-not-allowed': loadingRegister }"
						@click="onClickRegister"
					>
						<Loader2 v-if="loadingRegister" class="mr-2 h-4 w-4 animate-spin" />
						Register
					</Button>
				</div>
			</div>
		</div>

		<div v-else class="flex flex-col gap-3">
			<div class="p-4 bg-secondary rounded-[--radius] border">
				<div class="flex items-center gap-2 text-foreground mb-2">
					<span>✓</span>
					<span>Successfully authenticated</span>
				</div>
				<p class="text-sm text-muted-foreground">
					Logged in as <span class="font-medium text-foreground">{{ displayUsername }}</span>
				</p>
			</div>

			<div class="grid gap-2">
				<Button
					@click="onClickConfirm"
					class="bg-primary text-primary-foreground hover:bg-primary/90"
					:disabled="!isPasskeyRPHealthy"
				>
					Confirm
				</Button>
				<Button
					@click="onClickLogout"
					variant="outline"
					class="border-input hover:bg-accent hover:text-accent-foreground"
					:disabled="!isPasskeyRPHealthy"
				>
					Logout
				</Button>
			</div>
		</div>

		<p v-if="error" class="error-section">
			{{ error }}
		</p>
	</div>
</template>

<style lang="css" scoped></style>
