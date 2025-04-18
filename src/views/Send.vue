<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useSA } from '@/stores/useSA'
import { X } from 'lucide-vue-next'
import { parseEther, Interface } from 'ethers'
import { ADDRESS } from 'sendop'
import { notify } from '@kyvg/vue3-notification'

type Execution = {
	to: string
	value: string
	data: string
}

function getDefaultExecution(): Execution {
	return {
		to: ADDRESS.Counter,
		value: '0',
		data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [101]),
	}
}

const executions = ref<Execution[]>([getDefaultExecution()])

const addExecution = () => {
	executions.value.push(getDefaultExecution())
}

const removeExecution = (index: number) => {
	executions.value.splice(index, 1)
}

const loading = ref(false)
const error = ref<string | null>(null)

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
	<div class="space-y-4">
		<div v-for="(tx, index) in executions" :key="index" class="p-4 border rounded-lg">
			<div class="flex justify-between items-center mb-2">
				<h3>Execution {{ index + 1 }}</h3>
				<Button
					variant="destructive"
					class="w-8 h-8"
					@click="removeExecution(index)"
					:disabled="executions.length === 1"
				>
					<X class="w-4 h-4" />
				</Button>
			</div>
			<div class="space-y-2">
				<Input v-model="tx.to" placeholder="to" />
				<Input v-model="tx.value" placeholder="value" />
				<Input v-model="tx.data" placeholder="calldata" />
			</div>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" @click="addExecution">Add Execution</Button>
			<Button :loading="loading" @click="onClickSend">Send send-token</Button>
		</div>

		<div v-if="error" class="text-red-500">{{ error }}</div>
	</div>
</template>
