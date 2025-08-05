<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { IS_STAGING } from '@/config'
import { useAccount } from '@/stores/account/useAccount'
import { useTxModal } from '@/stores/useTxModal'
import { Interface, isAddress, parseEther } from 'ethers'
import { Eraser, Plus, X, Zap } from 'lucide-vue-next'

const { isAccountAccessible, selectedAccount } = useAccount()

type Execution = {
	description?: string
	to: string
	value: string
	data: string
}

function getDefaultExecution(): Execution {
	return {
		to: '',
		value: '0',
		data: '',
	}
}

const executions = ref<Execution[]>([getDefaultExecution()])
const loading = ref(false)
const error = ref<string | null>(null)

const addExecution = () => {
	executions.value.push(getDefaultExecution())
}

const removeExecution = (index: number) => {
	if (executions.value.length > 1) {
		executions.value.splice(index, 1)
	}
}

const onClickMintTestToken = (index: number) => {
	if (!selectedAccount.value) return

	executions.value[index] = {
		description: 'Mint Test Token to the account',
		to: '0xef26611a6f2cb9f2f6234F4635d98a7094c801Ce',
		value: '0',
		data: new Interface(['function mint(address,uint256)']).encodeFunctionData('mint', [
			selectedAccount.value?.address,
			parseEther('10'),
		]),
	}
}

const onClickClearInputs = (index: number) => {
	executions.value[index] = {
		to: '',
		value: '0',
		data: '',
	}
}

const isValidExecutions = computed(() => {
	return executions.value.every(exec => {
		const to = exec.to
		const value = exec.value

		if (!isAddress(to)) return false
		if (value === '') return false
		if (!Number.isFinite(Number(value))) return false // note: Number.isFinite cannot check empty string
		if (Number(value) < 0) return false

		return true
	})
})

const reviewDisabled = computed(() => {
	return !isAccountAccessible.value || !isValidExecutions.value || executions.value.length === 0
})

const reviewButtonText = computed(() => {
	return isAccountAccessible.value ? 'Review Executions' : 'Connect your account first'
})

async function onClickSend() {
	useTxModal().openModal({
		executions: executions.value.map(exec => ({
			description: exec.description,
			to: exec.to,
			value: BigInt(parseEther(exec.value)),
			data: exec.data,
		})),
	})
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
					:disabled="reviewDisabled"
				>
					{{ reviewButtonText }}
				</Button>
			</div>

			<div class="space-y-3">
				<div
					v-for="(tx, index) in executions"
					:key="index"
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
					<Button
						v-if="executions.length > 1"
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

						<div class="flex gap-2 mt-2">
							<Button
								v-if="IS_STAGING"
								variant="outline"
								size="sm"
								@click="onClickMintTestToken(index)"
								class="px-3 py-1 text-xs border-border/50 hover:border-primary hover:bg-primary/5"
								:disabled="!isAccountAccessible"
							>
								<Zap class="mr-1 h-3 w-3" />
								Mint Test Token
							</Button>

							<Button
								variant="outline"
								size="sm"
								@click="onClickClearInputs(index)"
								class="px-3 py-1 text-xs border-border/50 hover:border-destructive hover:bg-destructive/5"
							>
								<Eraser class="mr-1 h-3 w-3" />
								Clear
							</Button>
						</div>
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
