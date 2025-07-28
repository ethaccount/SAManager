<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { TrashIcon, CopyIcon, CheckIcon } from 'lucide-vue-next'
import { useConfirmModal } from '@/components/ConfirmModal/useConfirmModal'

interface StorageItem {
	key: string
	value: string
	size: number
}

const items = ref<StorageItem[]>([])
const confirmModal = useConfirmModal()
const copiedStates = ref<Record<string, boolean>>({})

function refreshItems() {
	const newItems: StorageItem[] = []
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i)
		if (!key) continue
		const value = localStorage.getItem(key) || ''
		newItems.push({
			key,
			value,
			size: new Blob([value]).size,
		})
	}
	items.value = newItems
}

function removeItem(key: string) {
	localStorage.removeItem(key)
	refreshItems()
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatValue(value: string): string {
	try {
		const parsed = JSON.parse(value)
		return JSON.stringify(parsed, null, 2)
	} catch {
		return value
	}
}

async function onClickDelete(key: string) {
	confirmModal.openModal({
		title: 'Delete Item',
		message: 'Are you sure you want to delete this item? This action cannot be undone.',
		confirmText: 'Delete',
		cancelText: 'Cancel',
		onResult: confirmed => {
			if (confirmed) {
				removeItem(key)
			}
		},
	})
}

async function onClickCopy(key: string, value: string) {
	try {
		await navigator.clipboard.writeText(value)
		copiedStates.value[key] = true
		setTimeout(() => {
			copiedStates.value[key] = false
		}, 2000)
	} catch (error) {
		console.error('Failed to copy:', error)
	}
}

// Initial load
refreshItems()
</script>

<template>
	<CenterStageLayout>
		<div class="w-full">
			<div class="mb-6">
				<h1 class="text-2xl font-semibold">App Settings</h1>
			</div>
			<div>
				<div class="space-y-6">
					<div class="flex flex-col">
						<h3 class="text-lg font-medium">Local Storage</h3>
						<p class="text-sm text-muted-foreground mb-4">
							Manage data stored in your browser's local storage
						</p>

						<div class="border rounded-lg p-4">
							<div v-for="item in items" :key="item.key" class="mb-3 pb-3 border-b last:border-b-0">
								<div class="flex items-start justify-between gap-2 mb-1">
									<div class="flex items-center gap-2">
										<div class="font-mono text-xs text-muted-foreground break-all">
											{{ item.key }}
										</div>
										<div class="text-[10px] text-muted-foreground/70 tabular-nums">
											{{ formatSize(item.size) }}
										</div>
									</div>
									<div class="flex gap-1 flex-shrink-0">
										<Button
											variant="ghost"
											size="icon"
											class="h-6 w-6 text-muted-foreground hover:text-foreground"
											@click="onClickCopy(item.key, item.value)"
											:title="copiedStates[item.key] ? 'Copied!' : 'Copy value'"
										>
											<CheckIcon
												v-if="copiedStates[item.key]"
												class="h-3.5 w-3.5 text-green-600"
											/>
											<CopyIcon v-else class="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-6 w-6 text-muted-foreground hover:text-destructive"
											@click="onClickDelete(item.key)"
											title="Delete item"
										>
											<TrashIcon class="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
								<pre
									class="text-xs bg-muted p-2 rounded whitespace-pre-wrap break-all overflow-x-auto max-h-[200px] elegant-scrollbar"
									>{{ formatValue(item.value) }}</pre
								>
							</div>
							<div v-if="items.length === 0" class="text-center text-muted-foreground py-4">
								No local storage items found
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</CenterStageLayout>
</template>

<style lang="css" scoped>
.elegant-scrollbar {
	@apply [&::-webkit-scrollbar]:w-2 
		 [&::-webkit-scrollbar-thumb]:rounded 
		 [&::-webkit-scrollbar-track]:bg-transparent 
		 [&::-webkit-scrollbar-thumb]:bg-foreground/25 
		 hover:[&::-webkit-scrollbar-thumb]:bg-foreground/50;
}
</style>
