<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TokenTransfer, tokens } from '@/lib/token'
import { useAccount } from '@/stores/account/useAccount'
import { useTxModal } from '@/stores/useTxModal'
import { isAddress } from 'ethers'

const { isAccountConnected } = useAccount()

function getDefaultTransfer(): TokenTransfer {
	return {
		recipient: '',
		amount: '0',
		tokenId: tokens[0].id,
	}
}

const transfer = ref<TokenTransfer>(getDefaultTransfer())

const isValidTransfers = computed(() => {
	const recipient = transfer.value.recipient
	const amount = transfer.value.amount

	if (!isAddress(recipient)) return false
	if (amount === '') return false
	if (!Number.isFinite(Number(amount))) return false // note: Number.isFinite cannot check empty string
	if (Number(amount) <= 0) return false

	return true
})

const onClickReview = () => {
	useTxModal().openModal({
		executions: [],
	})
}

const reviewDisabled = computed(() => {
	return !isAccountConnected.value || !isValidTransfers.value
})

const reviewButtonText = computed(() => {
	if (!isAccountConnected.value) return 'Connect your account to review'
	if (!isValidTransfers.value) return 'Invalid schedule transfer'
	return 'Review schedule transfer'
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
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
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
									type="text"
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
		</CardContent>
	</Card>
</template>

<style lang="css" scoped></style>
