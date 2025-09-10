<script setup lang="ts">
import { useSafeApps } from '@/features/browser/useSafeApps'
import { useAccount } from '@/stores/account/useAccount'
import { DEFAULT_BROWSER_URL } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const { selectedAccount } = useAccount()
const { selectedChainId } = useBlockchain()

const currentUrl = ref(DEFAULT_BROWSER_URL)
const urlInput = ref(DEFAULT_BROWSER_URL)
const iframe = ref<HTMLIFrameElement>()
const history = ref<string[]>([DEFAULT_BROWSER_URL])
const historyIndex = ref(0)
const isLoading = ref(true)

const canGoBack = computed(() => historyIndex.value > 0)
const canGoForward = computed(() => historyIndex.value < history.value.length - 1)

const { initialize, communicator } = useSafeApps()

onMounted(async () => {
	initializeFromRoute()

	if (iframe.value) {
		initialize(iframe.value)
	}
})

onUnmounted(() => {
	communicator.value?.clear()
})

watch([selectedAccount, selectedChainId], async () => {
	refreshBrowser()
})

function refreshBrowser() {
	isLoading.value = true

	try {
		communicator.value?.clear()

		// Refresh iframe
		if (iframe.value) {
			iframe.value.contentWindow?.location.reload()
		}
	} catch (error) {
		console.error('Error refreshing browser', error)
		// Fallback: force reload by manipulating src
		if (iframe.value) {
			iframe.value.src = 'about:blank'
			setTimeout(() => {
				if (iframe.value) {
					iframe.value.src = currentUrl.value
					initialize(iframe.value)
				}
			}, 100)
		}
	}
}

function navigateToUrl(url: string) {
	isLoading.value = true

	// Add to history if it's a new URL
	if (url !== currentUrl.value) {
		// Remove any forward history when navigating to a new URL
		history.value = history.value.slice(0, historyIndex.value + 1)
		history.value.push(url)
		historyIndex.value = history.value.length - 1
	}

	currentUrl.value = url
	urlInput.value = url

	updateRouteUrlQuery(url)
}

watchImmediate(
	() => route.query.url,
	() => {
		initializeFromRoute()
	},
)

watchImmediate(
	() => route.params.chainId,
	() => {
		updateRouteUrlQuery(currentUrl.value)
	},
)

function initializeFromRoute() {
	if (route.query.url) {
		const url = Array.isArray(route.query.url) ? route.query.url[0] : route.query.url

		if (url && url !== currentUrl.value) {
			currentUrl.value = url
			urlInput.value = url

			// Initialize history with the current URL
			if (history.value.length === 1 && history.value[0] === DEFAULT_BROWSER_URL) {
				history.value = [url]
			} else if (!history.value.includes(url)) {
				history.value.push(url)
				historyIndex.value = history.value.length - 1
			}
		}
	}
}

function updateRouteUrlQuery(url: string) {
	const basePath = `/${route.params.chainId}/browser`

	router.replace({
		path: basePath,
		query: { url },
	})
}

function onClickBack() {
	if (canGoBack.value) {
		isLoading.value = true
		historyIndex.value--
		currentUrl.value = history.value[historyIndex.value]
		urlInput.value = currentUrl.value

		updateRouteUrlQuery(currentUrl.value)
	}
}

function onClickForward() {
	if (canGoForward.value) {
		isLoading.value = true
		historyIndex.value++
		currentUrl.value = history.value[historyIndex.value]
		urlInput.value = currentUrl.value
		updateRouteUrlQuery(currentUrl.value)
	}
}

function onClickRefresh() {
	refreshBrowser()
}

function onClickUrlSubmit() {
	navigateToUrl(urlInput.value)
}

function iframeLoad() {
	setTimeout(() => {
		isLoading.value = false
	}, 1000)
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
					<div v-if="isLoading" class="h-10 w-10 flex items-center justify-center">
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
					@load="iframeLoad"
					sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="css" scoped></style>
