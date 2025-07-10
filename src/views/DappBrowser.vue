<script setup lang="ts">
import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from 'lucide-vue-next'

// State
const route = useRoute()
const router = useRouter()

const defaultUrl = 'https://app.uniswap.org/swap?lng=en'
const currentUrl = ref(defaultUrl)
const urlInput = ref(defaultUrl)
const iframe = ref<HTMLIFrameElement>()
const history = ref<string[]>([defaultUrl])
const historyIndex = ref(0)
const isLoading = ref(false)

const canGoBack = computed(() => historyIndex.value > 0)
const canGoForward = computed(() => historyIndex.value < history.value.length - 1)

// Lifecycle hooks
onMounted(() => {
	initializeFromRoute()
})

// Watchers
watchImmediate(
	() => route.query.url,
	() => {
		initializeFromRoute()
	},
)

watch(
	() => route.params.chainId,
	() => {
		// Update router path when chain changes
		if (currentUrl.value !== defaultUrl) {
			updateRouter(currentUrl.value)
		}
	},
)

// Important functions
function initializeFromRoute() {
	if (route.query.url) {
		const url = Array.isArray(route.query.url) ? route.query.url[0] : route.query.url

		if (url && url !== currentUrl.value) {
			currentUrl.value = url
			urlInput.value = url

			// Initialize history with the current URL
			if (history.value.length === 1 && history.value[0] === defaultUrl) {
				history.value = [url]
			} else if (!history.value.includes(url)) {
				history.value.push(url)
				historyIndex.value = history.value.length - 1
			}
		}
	}
}

function updateRouter(url: string) {
	const basePath = `/${route.params.chainId}/browser`

	if (url === defaultUrl) {
		// Navigate to base browser path for default URL
		router.replace(basePath)
	} else {
		// Navigate to browser with URL query param
		router.replace({
			path: basePath,
			query: { url },
		})
	}
}

function navigateToUrl(url: string) {
	// Add to history if it's a new URL
	if (url !== currentUrl.value) {
		// Remove any forward history when navigating to a new URL
		history.value = history.value.slice(0, historyIndex.value + 1)
		history.value.push(url)
		historyIndex.value = history.value.length - 1
	}

	currentUrl.value = url
	urlInput.value = url
	isLoading.value = true

	// Update router
	updateRouter(url)
}

function onClickBack() {
	if (canGoBack.value) {
		historyIndex.value--
		currentUrl.value = history.value[historyIndex.value]
		urlInput.value = currentUrl.value
		isLoading.value = true
		updateRouter(currentUrl.value)
	}
}

function onClickForward() {
	if (canGoForward.value) {
		historyIndex.value++
		currentUrl.value = history.value[historyIndex.value]
		urlInput.value = currentUrl.value
		isLoading.value = true
		updateRouter(currentUrl.value)
	}
}

function onClickRefresh() {
	isLoading.value = true
	if (iframe.value) {
		iframe.value.src = iframe.value.src
	}
}

function onClickUrlSubmit() {
	navigateToUrl(urlInput.value)
}

function handleIframeLoad() {
	isLoading.value = false
	try {
		// Try to get the actual URL from iframe (may fail due to CORS)
		if (iframe.value?.contentWindow?.location?.href) {
			const actualUrl = iframe.value.contentWindow.location.href
			if (actualUrl !== 'about:blank' && actualUrl !== currentUrl.value) {
				currentUrl.value = actualUrl
				urlInput.value = actualUrl
			}
		}
	} catch {
		// Ignore CORS errors
	}
}

function handleKeyPress(e: KeyboardEvent) {
	if (e.key === 'Enter') {
		onClickUrlSubmit()
	}
}
</script>

<template>
	<div class="h-full flex flex-col">
		<!-- Browser toolbar -->
		<div
			class="flex items-center px-4 py-1 border-b border-gray-200 bg-gray-100 dark:bg-gray-800 dark:border-gray-700 flex-shrink-0"
		>
			<!-- Navigation buttons -->
			<div class="flex items-center space-x-1">
				<Button variant="ghost" size="sm" :disabled="!canGoBack" @click="onClickBack" class="p-1 h-8 w-8">
					<ArrowLeft class="w-4 h-4" />
				</Button>
				<Button variant="ghost" size="sm" :disabled="!canGoForward" @click="onClickForward" class="p-1 h-8 w-8">
					<ArrowRight class="w-4 h-4" />
				</Button>

				<!-- Refresh -->
				<div class="flex items-center">
					<Button v-if="!isLoading" variant="ghost" size="sm" @click="onClickRefresh" class="">
						<RotateCcw class="w-4 h-4" />
					</Button>

					<!-- Loading indicator -->
					<div v-if="isLoading" class="">
						<Loader2 class="w-4 h-4 animate-spin" />
					</div>
				</div>
			</div>

			<!-- URL input -->
			<div class="flex items-center ml-4 flex-1">
				<Input
					v-model="urlInput"
					placeholder="Enter URL..."
					class="flex-1"
					@keypress="handleKeyPress"
					@blur="onClickUrlSubmit"
				/>
			</div>
		</div>

		<!-- Web content iframe container -->
		<div class="flex-1 p-4 bg-gray-50 dark:bg-gray-900 min-h-0">
			<div class="rounded-2xl w-full h-full overflow-hidden">
				<iframe
					ref="iframe"
					:src="currentUrl"
					class="w-full h-full"
					@load="handleIframeLoad"
					sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="css" scoped></style>
