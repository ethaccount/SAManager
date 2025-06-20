<script setup lang="ts">
import { getFrequencyOptions, useReviewButton, validateAmount, validateTimes } from '@/lib/scheduling/common'
import { DEFAULT_FEE, DEFAULT_SLIPPAGE, getSwapParameters, SwapParameters } from '@/lib/scheduling/swap-utils'
import { ScheduleSwap, useScheduleSwap } from '@/lib/scheduling/useScheduleSwap'
import { getToken, getTokens, NATIVE_TOKEN_ADDRESS } from '@/lib/token'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import { formatUnits, parseUnits } from 'ethers'
import { AlertTriangle, ArrowUpDown, CalendarIcon, Loader2 } from 'lucide-vue-next'

const { selectedChainId, client } = useBlockchain()

const dateFormatter = new DateFormatter('en-US', {
	dateStyle: 'long',
})

const availableTokens = computed(() => {
	const allTokens = getTokens(selectedChainId.value)
	// Only include WETH and USDC tokens, exclude native ETH
	return allTokens.filter(token => token.symbol === 'WETH' || token.symbol === 'USDC')
})

function getDefaultSwap(): ScheduleSwap {
	const wethToken = availableTokens.value.find(token => token.symbol === 'WETH')
	const usdcToken = availableTokens.value.find(token => token.symbol === 'USDC')

	return {
		tokenIn: wethToken?.address || availableTokens.value[0]?.address || NATIVE_TOKEN_ADDRESS,
		tokenOut: usdcToken?.address || availableTokens.value[1]?.address || NATIVE_TOKEN_ADDRESS,
		amountIn: '0.0001',
		frequency: '10sec',
		times: 3,
		startDate: today(getLocalTimeZone()),
	}
}

const scheduledSwapInput = ref<ScheduleSwap>(getDefaultSwap())

const frequencies = getFrequencyOptions()

// State for swap parameters
const minAmountOut = ref<string>('0')
const isLoadingSwapParams = ref(false)
const swapParamsError = ref<string | null>(null)

// Fetch swap parameters and calculate minimum amount out
async function fetchSwapParameters() {
	const tokenIn = scheduledSwapInput.value.tokenIn
	const tokenOut = scheduledSwapInput.value.tokenOut
	const amountIn = scheduledSwapInput.value.amountIn

	// Reset state
	minAmountOut.value = '0'
	swapParamsError.value = null

	// Skip if invalid inputs
	if (!tokenIn || !tokenOut || tokenIn === tokenOut || !amountIn || Number(amountIn) <= 0) {
		swapParamsError.value = 'Invalid swap parameters'
		return
	}

	const tokenInInfo = getToken(selectedChainId.value, tokenIn)
	const tokenOutInfo = getToken(selectedChainId.value, tokenOut)

	if (!tokenInInfo || !tokenOutInfo) {
		swapParamsError.value = 'Token information not found'
		return
	}

	try {
		isLoadingSwapParams.value = true

		const swapParams: SwapParameters = {
			tokenIn,
			tokenOut,
			amountIn: parseUnits(amountIn, tokenInInfo.decimals),
			slippageTolerance: DEFAULT_SLIPPAGE,
			fee: DEFAULT_FEE,
		}

		const { amountOutMinimum } = await getSwapParameters(client.value, swapParams)
		minAmountOut.value = formatUnits(amountOutMinimum, tokenOutInfo.decimals)
	} catch (error: unknown) {
		console.error('Failed to fetch minimum amount out:', error)
		swapParamsError.value = 'Failed to fetch minimum amount out'
		minAmountOut.value = '0'
	} finally {
		isLoadingSwapParams.value = false
	}
}

// Watch for changes in swap inputs and refetch parameters
watchImmediate(
	[
		() => scheduledSwapInput.value.tokenIn,
		() => scheduledSwapInput.value.tokenOut,
		() => scheduledSwapInput.value.amountIn,
		() => selectedChainId.value,
	],
	async () => {
		await fetchSwapParameters()
	},
)

const isValidSwap = computed(() => {
	const tokenIn = scheduledSwapInput.value.tokenIn
	const tokenOut = scheduledSwapInput.value.tokenOut
	const amountIn = scheduledSwapInput.value.amountIn
	const times = scheduledSwapInput.value.times

	if (!tokenIn || !tokenOut) return false
	if (tokenIn === tokenOut) return false
	if (!validateAmount(amountIn)) return false
	if (!validateTimes(times)) return false
	if (swapParamsError.value) return false

	return true
})

const { isLoadingReview, reviewScheduleSwap } = useScheduleSwap()

const { reviewDisabled, reviewButtonText } = useReviewButton(isValidSwap, isLoadingReview, 'swap')

async function onClickReview() {
	await reviewScheduleSwap({
		...scheduledSwapInput.value,
		startDate: scheduledSwapInput.value.startDate as DateValue,
	})
}

// Switch tokens function
function switchTokens() {
	const tokenIn = scheduledSwapInput.value.tokenIn
	const tokenOut = scheduledSwapInput.value.tokenOut

	scheduledSwapInput.value.tokenIn = tokenOut
	scheduledSwapInput.value.tokenOut = tokenIn

	// Clear amount to avoid confusion
	scheduledSwapInput.value.amountIn = ''
}
</script>

<template>
	<Card class="w-full bg-background/50 backdrop-blur-sm border-none shadow-none">
		<CardContent class="pt-4">
			<!-- Review Button -->
			<div>
				<Button
					class="w-full bg-primary/90 hover:bg-primary disabled:opacity-50"
					size="lg"
					@click="onClickReview"
					:disabled="reviewDisabled"
					:loading="isLoadingReview"
				>
					{{ reviewButtonText }}
				</Button>
			</div>

			<div class="mt-4 space-y-4">
				<!-- Token Swap Section -->
				<div class="relative">
					<!-- From Token -->
					<div
						class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
					>
						<div class="flex justify-between items-center mb-2">
							<h3 class="text-sm font-medium text-muted-foreground">You pay</h3>
						</div>
						<div class="flex items-center justify-between">
							<Input
								id="amountIn"
								type="text"
								placeholder="0"
								v-model="scheduledSwapInput.amountIn"
								class="border-none bg-transparent text-2xl font-semibold placeholder:text-muted-foreground/50 p-0 h-auto"
							/>
							<Select v-model="scheduledSwapInput.tokenIn">
								<SelectTrigger class="w-auto border-none bg-muted/50 h-auto px-3 py-2 rounded-full">
									<SelectValue>
										<div class="flex items-center gap-2">
											<span class="text-lg">{{
												getToken(selectedChainId, scheduledSwapInput.tokenIn)?.icon
											}}</span>
											<span class="font-medium">{{
												getToken(selectedChainId, scheduledSwapInput.tokenIn)?.symbol
											}}</span>
										</div>
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectItem
										v-for="token in availableTokens.filter(
											t => t.address !== scheduledSwapInput.tokenOut,
										)"
										:key="token.address"
										:value="token.address"
										class="cursor-pointer"
									>
										<div class="flex items-center gap-2">
											<span class="text-lg">{{ token.icon }}</span>
											<span>{{ token.symbol }}</span>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<!-- Switch Button -->
					<div class="flex justify-center relative -my-2 z-10">
						<Button
							variant="outline"
							size="icon"
							@click="switchTokens"
							class="rounded-full bg-background border-2 border-muted hover:border-border shadow-sm"
						>
							<ArrowUpDown class="h-4 w-4" />
						</Button>
					</div>

					<!-- To Token -->
					<div
						class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
					>
						<div class="flex justify-between items-center mb-2">
							<h3 class="text-sm font-medium text-muted-foreground">Minimum amount out</h3>
							<div v-if="isLoadingSwapParams" class="text-xs text-muted-foreground">
								<Loader2 class="h-3 w-3 animate-spin" />
							</div>
							<div v-else-if="swapParamsError" class="text-xs text-destructive">
								<AlertTriangle class="h-3 w-3" />
							</div>
						</div>
						<div class="flex items-center justify-between">
							<div
								class="text-2xl font-semibold"
								:class="swapParamsError ? 'text-destructive' : 'text-muted-foreground'"
							>
								{{ swapParamsError ? '0' : minAmountOut }}
							</div>
							<Select v-model="scheduledSwapInput.tokenOut">
								<SelectTrigger class="w-auto border-none bg-muted/50 h-auto px-3 py-2 rounded-full">
									<SelectValue>
										<div class="flex items-center gap-2">
											<span class="text-lg">{{
												getToken(selectedChainId, scheduledSwapInput.tokenOut)?.icon
											}}</span>
											<span class="font-medium">{{
												getToken(selectedChainId, scheduledSwapInput.tokenOut)?.symbol
											}}</span>
										</div>
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectItem
										v-for="token in availableTokens.filter(
											t => t.address !== scheduledSwapInput.tokenIn,
										)"
										:key="token.address"
										:value="token.address"
										class="cursor-pointer"
									>
										<div class="flex items-center gap-2">
											<span class="text-lg">{{ token.icon }}</span>
											<span>{{ token.symbol }}</span>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<!-- Frequency Section -->
				<div
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<h3 class="mb-2 text-sm font-medium">Frequency</h3>
							<Select v-model="scheduledSwapInput.frequency">
								<SelectTrigger id="frequency" class="border-none bg-muted">
									<SelectValue>
										<template #placeholder>Select frequency</template>
										{{ frequencies.find(f => f.id === scheduledSwapInput.frequency)?.label }}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectItem
										v-for="frequency in frequencies"
										:key="frequency.id"
										:value="frequency.id"
										class="cursor-pointer"
									>
										{{ frequency.label }}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<h3 class="mb-2 text-sm font-medium">Number of Times</h3>
							<Input
								id="times"
								type="number"
								min="1"
								max="10"
								v-model.number="scheduledSwapInput.times"
								class="border-none bg-muted"
							/>
						</div>
					</div>
				</div>

				<!-- Start Date Section -->
				<div
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
					<h3 class="mb-2 text-sm font-medium">Start Date</h3>
					<Popover>
						<PopoverTrigger class="w-full">
							<Button
								variant="outline"
								class="w-full justify-start text-left font-normal border-none bg-muted"
							>
								<CalendarIcon class="mr-2 h-4 w-4" />
								{{
									scheduledSwapInput.startDate
										? dateFormatter.format(scheduledSwapInput.startDate.toDate(getLocalTimeZone()))
										: 'Pick a date'
								}}
							</Button>
						</PopoverTrigger>
						<PopoverContent class="w-auto p-0">
							<Calendar v-model="scheduledSwapInput.startDate as DateValue" />
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped></style>
