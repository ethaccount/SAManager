<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JSONStringify } from 'json-with-bigint'
import { CopyIcon } from 'lucide-vue-next'
import { UserOperation, UserOperationHex } from 'sendop'

const props = defineProps<{
	userOp: {
		hex: () => UserOperationHex
		preview: () => UserOperation
		toRequestParams: () => [UserOperationHex, string]
		[key: string]: unknown
	} | null
}>()

type DisplayMode = 'hex' | 'preview' | 'toRequestParams'
const selectedMode = ref<DisplayMode>('toRequestParams')

async function copyUserOpJson() {
	if (!props.userOp || !formattedDisplay.value) return
	try {
		await navigator.clipboard.writeText(formattedDisplay.value)
	} catch (error) {
		console.error('Failed to copy UserOp data:', error)
	}
}

const displayData = computed(() => {
	if (!props.userOp) return null
	if (selectedMode.value === 'hex') {
		return props.userOp.hex()
	} else if (selectedMode.value === 'preview') {
		return props.userOp.preview()
	} else {
		return props.userOp.toRequestParams()
	}
})

const formattedDisplay = computed(() => {
	if (!displayData.value) return ''
	if (selectedMode.value === 'hex') {
		return JSONStringify(displayData.value, null, 2)
	} else if (selectedMode.value === 'preview') {
		return JSONStringify(displayData.value, null, 2)
	} else {
		return JSON.stringify(displayData.value, null, 2)
	}
})
</script>

<template>
	<div class="flex-1 mt-2 overflow-y-auto max-h-[420px] px-4 pt-2 pb-4">
		<div v-if="userOp" class="space-y-3">
			<Tabs v-model="selectedMode" class="w-full">
				<TabsList class="grid grid-cols-3 w-fit mx-auto">
					<TabsTrigger class="text-xs" value="toRequestParams">RPC Request</TabsTrigger>
					<TabsTrigger class="text-xs" value="preview">Preview</TabsTrigger>
					<TabsTrigger class="text-xs" value="hex">Hex</TabsTrigger>
				</TabsList>
				<TabsContent value="toRequestParams" class="mt-3">
					<div class="relative">
						<Button
							variant="ghost"
							size="icon"
							class="absolute top-2 right-2 z-10 h-6 w-6 text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background border border-border/50"
							@click="copyUserOpJson"
							title="Copy Request Params JSON"
						>
							<CopyIcon class="h-3.5 w-3.5" />
						</Button>
						<pre
							class="text-xs bg-muted p-2 rounded whitespace-pre-wrap break-all overflow-x-auto max-h-[300px]"
							>{{ formattedDisplay }}</pre
						>
					</div>
				</TabsContent>
				<TabsContent value="preview" class="mt-3">
					<div class="relative">
						<Button
							variant="ghost"
							size="icon"
							class="absolute top-2 right-2 z-10 h-6 w-6 text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background border border-border/50"
							@click="copyUserOpJson"
							title="Copy Preview JSON"
						>
							<CopyIcon class="h-3.5 w-3.5" />
						</Button>
						<pre
							class="text-xs bg-muted p-2 rounded whitespace-pre-wrap break-all overflow-x-auto max-h-[300px]"
							>{{ formattedDisplay }}</pre
						>
					</div>
				</TabsContent>
				<TabsContent value="hex" class="mt-3">
					<div class="relative">
						<Button
							variant="ghost"
							size="icon"
							class="absolute top-2 right-2 z-10 h-6 w-6 text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background border border-border/50"
							@click="copyUserOpJson"
							title="Copy Hex String"
						>
							<CopyIcon class="h-3.5 w-3.5" />
						</Button>
						<pre
							class="text-xs bg-muted p-2 rounded whitespace-pre-wrap break-all overflow-x-auto max-h-[300px] font-mono"
							>{{ formattedDisplay }}</pre
						>
					</div>
				</TabsContent>
			</Tabs>
		</div>
		<div v-else class="flex items-center justify-center h-32 text-muted-foreground">No UserOperation available</div>
	</div>
</template>
