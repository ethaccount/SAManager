<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { X } from 'lucide-vue-next'

type IExecution = {
	to: string
	value: number
	data: string
}

function getDefaultExecution(): IExecution {
	return { to: '0x9e8f8C3Ad87dBE7ACFFC5f5800e7433c8dF409F2', value: 0, data: '0x' }
}

const executions = ref<IExecution[]>([getDefaultExecution()])

const addExecution = () => {
	executions.value.push(getDefaultExecution())
}

const removeExecution = (index: number) => {
	executions.value.splice(index, 1)
}

const sendOperations = () => {
	console.log(executions.value)
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
				<Input v-model="tx.value" type="number" min="0" placeholder="value" />
				<Input v-model="tx.data" placeholder="calldata" />
			</div>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" @click="addExecution">Add Execution</Button>
			<Button @click="sendOperations">Send Operations</Button>
		</div>
	</div>
</template>
