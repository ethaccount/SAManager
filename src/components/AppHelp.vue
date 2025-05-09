<script setup lang="ts">
import { HelpCircle, Github, Settings } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { toRoute } from '@/lib/router'
import pkg from '../../package.json'

const router = useRouter()

const onClickAppSettings = () => {
	router.push(toRoute('settings'))
}

const onClickGithub = () => {
	window.open(pkg.repository, '_blank')
}
</script>

<template>
	<div class="group">
		<button class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="App menu">
			<HelpCircle class="w-5 h-5" />
		</button>

		<!-- Dropdown Menu -->
		<div
			class="absolute bottom-full left-0 mb-2 w-48 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
		>
			<!-- Theme Toggle -->
			<div
				class="w-full px-4 py-2 flex items-center justify-between gap-2 hover:bg-accent hover:text-accent-foreground rounded-t-lg"
			>
				<span>Theme</span>
				<ThemeSwitch />
			</div>

			<!-- GitHub Link -->
			<button
				@click="onClickGithub"
				class="w-full px-4 py-2 flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
			>
				<Github class="w-4 h-4" />
				<span>GitHub</span>
			</button>

			<!-- Version -->
			<div class="w-full px-4 py-2 flex items-center gap-2 text-muted-foreground">
				<span>Version: v{{ pkg.version }}</span>
			</div>

			<!-- Settings -->
			<button
				@click="onClickAppSettings"
				class="w-full px-4 py-2 flex items-center gap-2 hover:bg-accent hover:text-accent-foreground rounded-b-lg border-t border-border"
			>
				<Settings class="w-4 h-4" />
				<span>App Settings</span>
			</button>
		</div>
	</div>
</template>
