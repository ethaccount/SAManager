<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Plus } from 'lucide-vue-next'
import { useSA } from '@/stores/useSA'
import { parseEther } from 'ethers'
import { notify } from '@kyvg/vue3-notification'
import { Textarea } from '@/components/ui/textarea'

type Execution = {
	to: string
	value: string
	data: string
}

function getDefaultExecution(): Execution {
	return {
		to: '',
		value: '0',
		data: '0x',
	}
}

const executions = ref<Execution[]>([getDefaultExecution()])
const loading = ref(false)
const error = ref<string | null>(null)

const addExecution = () => {
	executions.value.push(getDefaultExecution())
}

const removeExecution = (index: number) => {
	executions.value.splice(index, 1)
}

const isValidExecutions = computed(() => {
	return executions.value.every(exec => exec.to.trim() !== '' && exec.value.trim() !== '' && exec.data.trim() !== '')
})

async function onClickSend() {
	const { smartAccount } = useSA()
	if (!smartAccount.value) {
		console.warn('No smart account')
		return
	}

	const execs: Execution[] = executions.value.map(e => ({
		to: e.to,
		value: parseEther(e.value).toString(),
		data: e.data,
	}))

	try {
		loading.value = true
		const op = await smartAccount.value.send(
			execs.map(e => ({
				to: e.to,
				value: BigInt(e.value),
				data: e.data,
			})),
		)
		console.info(`opHash: ${op.hash}`)

		const waitingToast = Date.now()
		notify({
			id: waitingToast,
			title: 'Waiting for User Operation',
			text: `op hash: ${op.hash}`,
			type: 'info',
			duration: -1,
		})

		const receipt = await op.wait()

		if (!receipt.success) {
			throw new Error(`UserOp is unsuccessful: ${JSON.stringify(receipt)}`)
		}

		notify.close(waitingToast)

		notify({
			title: 'User Operation Successful',
			text: `op hash: ${op.hash}`,
			type: 'success',
		})
	} catch (e: any) {
		console.error(e)
		error.value = e.message

		notify({
			title: 'User Operation Failed',
			text: e.message,
			type: 'error',
			duration: 5000,
		})
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<Card class="w-full bg-background/50 backdrop-blur-sm border-none shadow-none">
		<CardContent class="pt-6">
			<div class="mb-4">
				<Button
					class="w-full bg-primary/90 hover:bg-primary disabled:opacity-50"
					size="lg"
					:loading="loading"
					@click="onClickSend"
					:disabled="!isValidExecutions"
				>
					Send
				</Button>
			</div>

			<div class="space-y-3">
				<div
					v-for="(tx, index) in executions"
					:key="index"
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
					<Button
						variant="ghost"
						size="icon"
						@click="removeExecution(index)"
						:disabled="executions.length === 1"
						class="absolute -right-2 -top-2 h-6 w-6 opacity-50 hover:opacity-100 hover:bg-destructive/10 rounded-full bg-background shadow-sm"
					>
						<X class="h-3 w-3" />
					</Button>

					<div class="space-y-3">
						<Input
							v-model="tx.to"
							placeholder="To Address (0x...)"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>

						<Input
							v-model="tx.value"
							placeholder="Value (ETH)"
							type="number"
							class="border-none bg-muted text-lg placeholder:text-muted-foreground/50"
						/>

						<Textarea
							v-model="tx.data"
							placeholder="Call Data (0x...)"
							class="border-none bg-muted placeholder:text-muted-foreground/50 font-mono min-h-[80px] resize-y"
						/>
					</div>
				</div>
			</div>

			<Button
				variant="ghost"
				class="w-full mt-3 border border-dashed border-border/50 hover:border-primary hover:bg-primary/5"
				@click="addExecution"
			>
				<Plus class="mr-2 h-4 w-4" />
				Add Execution
			</Button>

			<div v-if="error" class="w-full mt-4 p-4 bg-destructive/10 text-destructive rounded-md text-sm">
				{{ error }}
			</div>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped>
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
	-webkit-appearance: none;
	margin: 0;
}
</style>
