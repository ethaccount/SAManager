<script setup lang="ts">
import { IS_STAGING } from '@/config'
import { toRoute } from '@/lib/router'
import { ExternalLink, HelpCircle, MessageCircle, Settings } from 'lucide-vue-next'
import pkg from '../../package.json'

const router = useRouter()

const isOpen = ref(false)

const onClickAppSettings = () => {
	router.push(toRoute('settings'))
	isOpen.value = false
}

const onClickGithub = () => {
	if (IS_STAGING) {
		window.open(`${pkg.repository}/tree/testnet`, '_blank')
	} else {
		window.open(pkg.repository, '_blank')
	}
	isOpen.value = false
}

const toggleMenu = () => {
	isOpen.value = !isOpen.value
}

// feat: click outside the menu to close it
const menu = useTemplateRef<HTMLElement>('menu')
onClickOutside(menu, () => {
	isOpen.value = false
})
</script>

<template>
	<div class="group">
		<button
			@click="toggleMenu"
			class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
			aria-label="App menu"
		>
			<HelpCircle class="w-5 h-5" />
		</button>

		<!-- Dropdown Menu -->
		<div
			ref="menu"
			v-show="isOpen"
			class="absolute bottom-full left-0 mb-2 w-48 bg-background border border-border rounded-lg shadow-lg transition-all duration-200"
		>
			<!-- Version -->
			<div class="w-full px-4 py-2 text-muted-foreground border-b border-border">
				<span>Version: {{ pkg.version }}</span>
			</div>

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
				class="w-full px-4 py-2 flex items-center gap-2 hover:bg-accent hover:text-accent-foreground rounded-b-lg border-t border-border"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
					<path
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
					/>
				</svg>
				<span>GitHub</span>
				<ExternalLink class="w-4 h-4" />
			</button>

			<!-- Feedback -->
			<!-- @docs https://docs.pushfeedback.com/category/customization -->
			<feedback-button project="oc9bd4ntqh" hide-rating="true" modal-position="center" button-style="default">
				<button
					class="w-full px-4 py-2 flex items-center gap-2 hover:bg-accent hover:text-accent-foreground border-t border-border"
				>
					<MessageCircle class="w-4 h-4" />
					<span class="font-sans">Quick Feedback</span>
				</button>
			</feedback-button>

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

<style></style>
