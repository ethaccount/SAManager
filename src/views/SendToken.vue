<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Plus, Code, X } from 'lucide-vue-next'

interface Token {
	id: string
	symbol: string
	name: string
	icon: string
}

interface Paymaster {
	id: string
	name: string
}

// Token transfer execution type
interface TokenTransfer {
	recipient: string
	amount: string
	tokenId: string
}

// Mock data
const tokens: Token[] = [
	{ id: 'eth', symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
	{ id: 'weth', symbol: 'WETH', name: 'Wrapped Ethereum', icon: 'Ξ' },
	{ id: 'usdc', symbol: 'USDC', name: 'USD Coin', icon: '$' },
]

const paymasters: Paymaster[] = [
	{ id: 'open', name: 'OpenPaymaster' },
	{ id: 'circle', name: 'Circle USDC Paymaster' },
]

function getDefaultTransfer(): TokenTransfer {
	return {
		recipient: '',
		amount: '',
		tokenId: tokens[0].id,
	}
}

const transfers = ref<TokenTransfer[]>([getDefaultTransfer()])
const isAtomic = ref(true)
const isBundle = ref(false)
const selectedPaymaster = ref<Paymaster>(paymasters[0])
const simulationDone = ref(false)
const showUserOp = ref(false)

const addTransfer = () => {
	transfers.value.push(getDefaultTransfer())
}

const removeTransfer = (index: number) => {
	if (transfers.value.length > 1) {
		transfers.value.splice(index, 1)
	}
}

const onClickReview = () => {
	if (!simulationDone.value) {
		// Mock simulation
		console.log('Simulating transactions...', transfers.value)
		simulationDone.value = true
	} else {
		// Mock sending
		console.log('Sending transactions...', transfers.value)
		// Reset after sending
		simulationDone.value = false
	}
}

const handleAtomicChange = (checked: boolean) => {
	isAtomic.value = checked
	if (checked) isBundle.value = false
}

const handleBundleChange = (checked: boolean) => {
	isBundle.value = checked
	if (checked) isAtomic.value = false
}
</script>

<template>
	<Card>
		<CardHeader class="flex flex-row items-center justify-between">
			<div>
				<CardTitle>Send Token</CardTitle>
				<CardDescription>Transfer tokens to another address</CardDescription>
			</div>
			<!-- <Popover>
					<PopoverTrigger>
						<Button variant="outline" size="icon">
							<Settings class="h-4 w-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent class="w-80">
						<div class="grid gap-4">
							<div class="space-y-2">
								<h4 class="font-medium text-sm">Transaction Settings</h4>
								<div class="flex items-center space-x-2">
									<Checkbox
										id="atomic"
										v-model:checked="isAtomic"
										@update:checked="handleAtomicChange"
									/>
									<Label for="atomic">Atomic (Default)</Label>
								</div>
								<div class="flex items-center space-x-2">
									<Checkbox
										id="bundle"
										v-model:checked="isBundle"
										@update:checked="handleBundleChange"
									/>
									<Label for="bundle">Bundle</Label>
								</div>
							</div>
							<div class="space-y-2">
								<h4 class="font-medium text-sm">Paymaster</h4>
								<Select v-model="selectedPaymaster.id">
									<SelectTrigger>
										<SelectValue placeholder="Select Paymaster" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem
											v-for="paymaster in paymasters"
											:key="paymaster.id"
											:value="paymaster.id"
										>
											{{ paymaster.name }}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</PopoverContent>
				</Popover> -->
		</CardHeader>

		<CardContent class="space-y-4">
			<div v-for="(transfer, index) in transfers" :key="index" class="p-4 border rounded-lg">
				<div class="flex justify-between items-center mb-2">
					<h3 class="text-sm font-medium">Transfer {{ index + 1 }}</h3>
					<Button
						variant="destructive"
						size="icon"
						@click="removeTransfer(index)"
						:disabled="transfers.length === 1"
					>
						<X class="h-4 w-4" />
					</Button>
				</div>

				<div class="space-y-2">
					<Label for="recipient">Recipient</Label>
					<Input id="recipient" placeholder="0x..." v-model="transfer.recipient" />
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div class="col-span-2 space-y-2">
						<Label for="amount">Amount</Label>
						<Input id="amount" type="number" placeholder="0.0" v-model="transfer.amount" />
					</div>
					<div class="space-y-2">
						<Label for="token">Token</Label>
						<Select v-model="transfer.tokenId">
							<SelectTrigger id="token">
								<SelectValue placeholder="Select Token" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem v-for="token in tokens" :key="token.id" :value="token.id">
									<div class="flex items-center">
										<span class="mr-2">{{ token.icon }}</span>
										<span>{{ token.symbol }}</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<Button variant="outline" class="w-full" @click="addTransfer">
				<Plus class="mr-2 h-4 w-4" />
				Add Another Transfer
			</Button>
		</CardContent>

		<CardFooter class="flex flex-col gap-4">
			<Button class="w-full" @click="onClickReview"> Review </Button>

			<!-- <div v-if="simulationDone" class="w-full p-4 bg-muted rounded-md text-sm">
					<div class="font-medium mb-2">Simulation Results:</div>
					<div class="text-muted-foreground">
						Transaction will send {{ amount || '0' }} {{ selectedToken.symbol }} to
						{{ recipient || '0x...' }}
					</div>
					<div class="text-muted-foreground">Estimated gas: 21,000</div>
				</div> -->

			<!-- <Button variant="outline" size="sm" class="self-end" @click="showUserOp = !showUserOp">
					<Code class="mr-2 h-4 w-4" />
					{{ showUserOp ? 'Hide' : 'Show' }} UserOperation
				</Button>

				<div v-if="showUserOp" class="w-full p-4 bg-muted rounded-md text-xs font-mono overflow-x-auto">
					{{
						`{
  "sender": "0x1234...5678",
  "nonce": "0x1",
  "initCode": "0x",
  "callData": "0x...",
  "callGasLimit": "0x...",
  "verificationGasLimit": "0x...",
  "preVerificationGas": "0x...",
  "maxFeePerGas": "0x...",
  "maxPriorityFeePerGas": "0x...",
  "paymasterAndData": "0x...",
  "signature": "0x..."
}`
					}}
				</div> -->
		</CardFooter>
	</Card>
</template>

<style lang="css" scoped></style>
