<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccount } from '@/stores/account/useAccount'
import { useTxModal } from '@/stores/useTxModal'
import { parseEther } from 'ethers'
import { Plus, X } from 'lucide-vue-next'
import { INTERFACES } from 'sendop'

type Token = {
	id: string
	symbol: string
	name: string
	icon: string
	address: string
}

type TokenTransfer = {
	recipient: string
	amount: string
	tokenId: string
}

const tokens: Token[] = [
	{ id: 'eth', symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
	{ id: 'usdc', symbol: 'USDC', name: 'USD Coin', icon: '$', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
]

function getDefaultTransfer(): TokenTransfer {
	return {
		recipient: '0xd78B5013757Ea4A7841811eF770711e6248dC282',
		amount: '0.01',
		tokenId: tokens[0].id,
	}
}

const transfers = ref<TokenTransfer[]>([getDefaultTransfer()])

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
	useTxModal().openModal(
		transfers.value.map(t => {
			if (t.tokenId === 'eth') {
				return {
					to: t.recipient,
					value: BigInt(parseEther(t.amount)),
					data: '0x',
				}
			} else {
				return {
					to: t.recipient,
					value: 0n,
					data: INTERFACES.IERC20.encodeFunctionData('transfer', [t.recipient, parseEther(t.amount)]),
				}
			}
		}),
	)
}

const { isAccountConnected } = useAccount()

const reviewDisabled = computed(() => {
	return !isAccountConnected.value || !isValidTransfers.value || transfers.value.length === 0
})

const reviewButtonText = computed(() => {
	return isAccountConnected.value ? 'Review Transfers' : 'Your account must be connected to review transfers'
})
</script>

<template>
	<Card class="w-full bg-background/50 backdrop-blur-sm border-none shadow-none">
		<CardContent class="pt-6">
			<div class="mb-4">
				<Button
					class="w-full bg-primary/90 hover:bg-primary disabled:opacity-50"
					size="lg"
					@click="onClickReview"
					:disabled="reviewDisabled"
				>
					{{ reviewButtonText }}
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
										<SelectValue>
											<template #placeholder>Token</template>
											<div class="flex items-center">
												<span class="mr-2 text-lg">{{
													tokens.find(t => t.id === transfer.tokenId)?.icon
												}}</span>
												<span>{{ tokens.find(t => t.id === transfer.tokenId)?.symbol }}</span>
											</div>
										</SelectValue>
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

<style lang="css" scoped></style>
