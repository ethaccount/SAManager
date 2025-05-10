<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'

const mode = useColorMode()

const toggleMode = () => {
	mode.value = mode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
	<button
		@click="toggleMode"
		class="relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-500 ease-in-out focus:outline-none"
		:class="mode === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-400'"
		role="switch"
		:aria-checked="mode === 'dark'"
	>
		<span class="sr-only">Toggle theme</span>
		<span
			class="absolute inset-y-0.5 start-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-500 ease-spring"
			:class="mode === 'dark' ? 'translate-x-5' : 'translate-x-0'"
		>
			<Sun
				v-if="mode === 'light'"
				class="absolute h-4 w-4 rotate-0 transform text-yellow-500 transition-all duration-500"
				:class="mode === 'light' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'"
			/>
			<Moon
				v-else
				class="absolute h-4 w-4 rotate-0 transform text-gray-700 transition-all duration-500"
				:class="mode === 'dark' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'"
			/>
		</span>
	</button>
</template>

<style scoped>
button {
	-webkit-tap-highlight-color: transparent;
}

.ease-spring {
	transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes rotate {
	from {
		transform: rotate(0deg) scale(0);
	}
	to {
		transform: rotate(360deg) scale(1);
	}
}

@keyframes rotate-reverse {
	from {
		transform: rotate(360deg) scale(0);
	}
	to {
		transform: rotate(0deg) scale(1);
	}
}

.scale-100 {
	animation: rotate 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.scale-0 {
	animation: rotate-reverse 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
