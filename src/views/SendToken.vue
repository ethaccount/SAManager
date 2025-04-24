<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'

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

const isValidTransfers = computed(() => {
	return transfers.value.every(
		transfer => transfer.recipient.trim() !== '' && transfer.amount.trim() !== '' && Number(transfer.amount) > 0,
	)
})

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
	<Card class="w-full bg-background/50 backdrop-blur-sm border-none shadow-none">
		<CardContent class="pt-6">
			<div class="mb-4">
				<Button
					class="w-full bg-primary/90 hover:bg-primary disabled:opacity-50"
					size="lg"
					@click="onClickReview"
					:disabled="!isValidTransfers"
				>
					Review Transfers
				</Button>
			</div>

			<div class="space-y-3">
				<div
					v-for="(transfer, index) in transfers"
					:key="index"
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
					<Button
						variant="ghost"
						size="icon"
						@click="removeTransfer(index)"
						:disabled="transfers.length === 1"
						class="absolute -right-2 -top-2 h-6 w-6 opacity-50 hover:opacity-100 hover:bg-destructive/10 rounded-full bg-background shadow-sm"
					>
						<X class="h-3 w-3" />
					</Button>

					<div class="space-y-3">
						<Input
							id="recipient"
							placeholder="Recipient Address (0x...)"
							v-model="transfer.recipient"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>

						<div class="grid grid-cols-3 gap-2">
							<div class="col-span-2">
								<Input
									id="amount"
									type="number"
									placeholder="0.0"
									v-model="transfer.amount"
									class="border-none bg-muted text-lg placeholder:text-muted-foreground/50"
								/>
							</div>
							<div>
								<Select v-model="transfer.tokenId">
									<SelectTrigger id="token" class="border-none bg-muted">
										<SelectValue placeholder="Token" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem
											v-for="token in tokens"
											:key="token.id"
											:value="token.id"
											class="cursor-pointer"
										>
											<div class="flex items-center">
												<span class="mr-2 text-lg">{{ token.icon }}</span>
												<span>{{ token.symbol }}</span>
											</div>
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Button
				variant="ghost"
				class="w-full mt-3 border border-dashed border-border/50 hover:border-primary hover:bg-primary/5"
				@click="addTransfer"
			>
				<Plus class="mr-2 h-4 w-4" />
				Add Transfer
			</Button>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped>
:deep(.select-trigger) {
	height: 2.75rem;
}

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
	-webkit-appearance: none;
	margin: 0;
}
</style>
