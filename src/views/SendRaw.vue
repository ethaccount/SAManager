<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-vue-next'
import { useSA } from '@/stores/useSA'
import { parseEther } from 'ethers'
import { notify } from '@kyvg/vue3-notification'

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
	<Card>
		<CardHeader>
			<div>
				<CardTitle>Send Raw Transaction</CardTitle>
				<CardDescription>Send raw transactions with custom data</CardDescription>
			</div>
		</CardHeader>

		<CardContent class="space-y-4">
			<div v-for="(tx, index) in executions" :key="index" class="p-4 border rounded-lg">
				<div class="flex justify-between items-center mb-2">
					<h3 class="text-sm font-medium">Execution {{ index + 1 }}</h3>
					<Button
						variant="destructive"
						size="icon"
						@click="removeExecution(index)"
						:disabled="executions.length === 1"
					>
						<X class="h-4 w-4" />
					</Button>
				</div>

				<div class="space-y-2">
					<div class="space-y-2">
						<Label>To Address</Label>
						<Input v-model="tx.to" placeholder="0x..." />
					</div>

					<div class="space-y-2">
						<Label>Value (ETH)</Label>
						<Input v-model="tx.value" placeholder="0.0" type="number" />
					</div>

					<div class="space-y-2">
						<Label>Call Data</Label>
						<Input v-model="tx.data" placeholder="0x..." />
					</div>
				</div>
			</div>

			<Button variant="outline" class="w-full" @click="addExecution"> Add Another Execution </Button>
		</CardContent>

		<CardFooter class="flex flex-col gap-4">
			<Button class="w-full" :loading="loading" @click="onClickSend"> Send </Button>

			<div v-if="error" class="w-full p-4 bg-destructive/10 text-destructive rounded-md text-sm">
				{{ error }}
			</div>
		</CardFooter>
	</Card>
</template>

<style lang="css" scoped></style>
