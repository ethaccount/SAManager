<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IS_STAGING } from '@/config'
import { checkTokenBalance } from '@/lib/tokens/helpers'
import { getToken, getTokens, NATIVE_TOKEN_ADDRESS, TokenTransfer } from '@/lib/tokens/token'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useExecutionModal } from '@/components/execution'
import { shortenAddress } from '@vue-dapp/core'
import { isAddress, parseUnits } from 'ethers'
import { Eraser, Plus, X, Zap } from 'lucide-vue-next'
import { INTERFACES } from 'sendop'

const { selectedChainId } = useBlockchain()
const availableTokens = computed(() => getTokens(selectedChainId.value))

function getDefaultTransfer(): TokenTransfer {
	return {
		recipient: '',
		amount: '0',
		tokenAddress: NATIVE_TOKEN_ADDRESS,
	}
}

const transfers = ref<TokenTransfer[]>([getDefaultTransfer()])

const isValidTransfers = computed(() => {
	return transfers.value.every(transfer => {
		const recipient = transfer.recipient
		const amount = transfer.amount

		if (!isAddress(recipient)) return false
		if (amount === '') return false
		if (!Number.isFinite(Number(amount))) return false // note: Number.isFinite cannot check empty string
		if (Number(amount) <= 0) return false

		return true
	})
})

const addTransfer = () => {
	transfers.value.push(getDefaultTransfer())
}

const removeTransfer = (index: number) => {
	if (transfers.value.length > 1) {
		transfers.value.splice(index, 1)
	}
}

const onClickSendTestToken = (index: number) => {
	// Find SAM token for test token
	const samToken = availableTokens.value.find(token => token.symbol === 'SAM')
	transfers.value[index] = {
		recipient: '0xd78B5013757Ea4A7841811eF770711e6248dC282',
		amount: '1',
		tokenAddress: samToken?.address || NATIVE_TOKEN_ADDRESS,
	}
}

const onClickClearInputs = (index: number) => {
	transfers.value[index] = {
		recipient: '',
		amount: '0',
		tokenAddress: NATIVE_TOKEN_ADDRESS,
	}
}

const onClickReview = async () => {
	const { selectedAccount } = useAccount()
	const { client } = useBlockchain()

	if (!selectedAccount.value || !client.value) {
		throw new Error('Account or client not available')
	}

	// Check balances for all transfers
	for (const transfer of transfers.value) {
		const token = getToken(selectedChainId.value, transfer.tokenAddress)
		if (!token) {
			throw new Error(`Token ${transfer.tokenAddress} not found`)
		}

		const requiredAmount = parseUnits(transfer.amount, token.decimals)
		await checkTokenBalance({
			client: client.value,
			accountAddress: selectedAccount.value.address,
			tokenAddress: transfer.tokenAddress,
			requiredAmount,
			chainId: selectedChainId.value,
		})
	}

	// If all balance checks pass, proceed with the transaction
	useExecutionModal().openModal({
		executions: transfers.value.map(t => {
			const token = getToken(selectedChainId.value, t.tokenAddress)
			if (!token) {
				throw new Error(`Token ${t.tokenAddress} not found`)
			}
			return {
				description: `Transfer ${t.amount} ${token.symbol} to ${shortenAddress(t.recipient)}`,
				to: token.address,
				value: 0n,
				data: INTERFACES.IERC20.encodeFunctionData('transfer', [
					t.recipient,
					parseUnits(t.amount, token.decimals),
				]),
			}
		}),
	})
}

const { isAccountAccessible } = useAccount()

const reviewDisabled = computed(() => {
	return !isAccountAccessible.value || !isValidTransfers.value || transfers.value.length === 0
})

const reviewButtonText = computed(() => {
	if (!isAccountAccessible.value) return 'Connect your account first'
	if (!isValidTransfers.value) return 'Invalid transfers'
	return 'Review Transfers'
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
						v-if="transfers.length > 1"
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
									type="text"
									placeholder="0.0"
									v-model="transfer.amount"
									class="border-none bg-muted text-lg placeholder:text-muted-foreground/50"
								/>
							</div>
							<div>
								<Select v-model="transfer.tokenAddress">
									<SelectTrigger id="token" class="border-none bg-muted">
										<SelectValue>
											<template #placeholder>Token</template>
											<div class="flex items-center">
												<span class="mr-2 text-lg">{{
													getToken(selectedChainId, transfer.tokenAddress)?.icon
												}}</span>
												<span>{{
													getToken(selectedChainId, transfer.tokenAddress)?.symbol
												}}</span>
											</div>
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectItem
											v-for="token in availableTokens"
											:key="token.address"
											:value="token.address"
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

						<div class="flex gap-2 mt-2">
							<Button
								v-if="IS_STAGING"
								variant="outline"
								size="sm"
								@click="onClickSendTestToken(index)"
								class="px-3 py-1 text-xs border-border/50 hover:border-primary hover:bg-primary/5"
								:disabled="!isAccountAccessible"
							>
								<Zap class="mr-1 h-3 w-3" />
								Send Test Token
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
				@click="addTransfer"
			>
				<Plus class="mr-2 h-4 w-4" />
				Add Transfer
			</Button>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped></style>
