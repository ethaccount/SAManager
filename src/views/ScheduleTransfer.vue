<script setup lang="ts">
import { getFrequencyOptions, useReviewButton, validateAmount, validateTimes } from '@/lib/scheduling/common'
import { ScheduleTransfer, useScheduleTransfer } from '@/lib/scheduling/useScheduleTransfer'
import { getToken, getTokenAddress, getTokens } from '@/lib/token'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import { isAddress } from 'ethers'
import { CalendarIcon } from 'lucide-vue-next'

const { selectedChainId } = useBlockchain()

const dateFormatter = new DateFormatter('en-US', {
	dateStyle: 'long',
})

const availableTokens = computed(() => getTokens(selectedChainId.value))

function getDefaultTransfer(): ScheduleTransfer {
	return {
		recipient: '0xd78B5013757Ea4A7841811eF770711e6248dC282',
		amount: '0.0001',
		tokenAddress: getTokenAddress(selectedChainId.value, 'WETH') || '',
		frequency: '10sec',
		times: 3,
		startDate: today(getLocalTimeZone()),
	}
}

const scheduledTransferInput = ref<ScheduleTransfer>(getDefaultTransfer())

const frequencies = getFrequencyOptions()

const isValidTransfers = computed(() => {
	const recipient = scheduledTransferInput.value.recipient
	const amount = scheduledTransferInput.value.amount
	const times = scheduledTransferInput.value.times

	if (!isAddress(recipient)) return false
	if (!validateAmount(amount)) return false
	if (!validateTimes(times)) return false

	return true
})

const { isLoadingReview, errorReview, reviewScheduleTransfer } = useScheduleTransfer()

const { reviewDisabled, reviewButtonText } = useReviewButton(isValidTransfers, errorReview, isLoadingReview, 'transfer')

async function onClickReview() {
	await reviewScheduleTransfer({
		...scheduledTransferInput.value,
		startDate: scheduledTransferInput.value.startDate as DateValue,
	})
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

			<div class="mt-4 space-y-3">
				<div
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
					<div class="space-y-3">
						<Input
							id="recipient"
							placeholder="Recipient Address (0x...)"
							v-model="scheduledTransferInput.recipient"
							class="border-none bg-muted placeholder:text-muted-foreground/50"
						/>

						<div class="grid grid-cols-3 gap-2">
							<div class="col-span-2">
								<Input
									id="amount"
									type="text"
									placeholder="0.0"
									v-model="scheduledTransferInput.amount"
									class="border-none bg-muted text-lg placeholder:text-muted-foreground/50"
								/>
							</div>
							<div>
								<Select v-model="scheduledTransferInput.tokenAddress">
									<SelectTrigger id="token" class="border-none bg-muted">
										<SelectValue>
											<template #placeholder>Token</template>
											<div class="flex items-center">
												<span class="mr-2 text-lg">{{
													getToken(selectedChainId, scheduledTransferInput.tokenAddress)?.icon
												}}</span>
												<span>{{
													getToken(selectedChainId, scheduledTransferInput.tokenAddress)
														?.symbol
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
					</div>
				</div>

				<!-- Frequency Section -->
				<div
					class="relative p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm transition-all duration-200 hover:border-border"
				>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<h3 class="mb-2 text-sm font-medium">Frequency</h3>
							<Select v-model="scheduledTransferInput.frequency">
								<SelectTrigger id="frequency" class="border-none bg-muted">
									<SelectValue>
										<template #placeholder>Select frequency</template>
										{{ frequencies.find(f => f.id === scheduledTransferInput.frequency)?.label }}
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
								v-model.number="scheduledTransferInput.times"
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
									scheduledTransferInput.startDate
										? dateFormatter.format(
												scheduledTransferInput.startDate.toDate(getLocalTimeZone()),
										  )
										: 'Pick a date'
								}}
							</Button>
						</PopoverTrigger>
						<PopoverContent class="w-auto p-0">
							<Calendar v-model="scheduledTransferInput.startDate as DateValue" />
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped></style>
