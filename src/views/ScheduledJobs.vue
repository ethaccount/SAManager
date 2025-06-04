<script setup lang="ts">
import { toRoute } from '@/lib/router'
import { formatDate, formatInterval, formatNextExecution, isJobCompleted, isJobOverdue } from '@/lib/scheduling/jobs'
import { useFetchJobs } from '@/lib/scheduling/useFetchJobs'
import { useAccount } from '@/stores/account/useAccount'
import { useTxModal } from '@/stores/useTxModal'
import { shortenAddress } from '@vue-dapp/core'
import { formatUnits } from 'ethers'
import { Clock, Loader2, Pause, Play, Zap } from 'lucide-vue-next'
import { ADDRESS, Execution, INTERFACES } from 'sendop'

const router = useRouter()
const { selectedAccount } = useAccount()

const { loading, error, jobs, fetchAccountJobs } = useFetchJobs()

onMounted(async () => {
	await fetchAccountJobs()
})

const onClickJobAction = async (jobId: number, action: 'disable' | 'enable') => {
	if (!selectedAccount.value) return

	try {
		const execution: Execution = {
			to: ADDRESS.ScheduledTransfers,
			value: 0n,
			data: INTERFACES.ScheduledTransfers.encodeFunctionData('toggleOrder', [jobId]),
		}

		useTxModal().openModal({
			executions: [execution],
			onSuccess: async () => {
				await fetchAccountJobs()
			},
		})
	} catch (err) {
		console.error(`Failed to ${action} job:`, err)
		error.value = err instanceof Error ? err.message : String(err)
	}
}

const onClickExecute = async (jobId: number) => {
	if (!selectedAccount.value) return

	try {
		const execution: Execution = {
			to: ADDRESS.ScheduledTransfers,
			value: 0n,
			data: INTERFACES.ScheduledTransfers.encodeFunctionData('executeOrder', [jobId]),
		}

		useTxModal().openModal({
			executions: [execution],
			onSuccess: async () => {
				await fetchAccountJobs()
			},
		})
	} catch (err) {
		console.error(`Failed to execute job:`, err)
		error.value = err instanceof Error ? err.message : String(err)
	}
}

function displayLastExecutionTime(lastExecutionTime: bigint) {
	if (lastExecutionTime === 0n) return 'Never'
	return formatDate(lastExecutionTime)
}

// sort by job id in descending order
const displayJobs = computed(() => {
	return jobs.value.slice().sort((a, b) => Number(b.id - a.id))
})
</script>

<template>
	<Card class="w-full bg-background/50 backdrop-blur-sm border-none shadow-none">
		<CardContent class="pt-6">
			<div class="space-y-6">
				<div class="space-y-4">
					<div v-if="!selectedAccount">
						<div class="text-center">
							<h3 class="text-xl font-semibold mb-3">No account selected</h3>
							<p class="text-muted-foreground mb-6 max-w-sm mx-auto">
								Please select an account to view scheduled jobs
							</p>
						</div>
					</div>
					<div v-else-if="loading">
						<Loader2 class="w-6 h-6 animate-spin text-primary mx-auto" />
					</div>
					<div v-else-if="error" class="text-center">
						<h3 class="text-xl font-semibold mb-3 text-destructive">Error loading jobs</h3>
						<p class="text-muted-foreground mb-6 max-w-sm mx-auto">
							{{ error }}
						</p>
					</div>
					<div v-else-if="!jobs.length" class="text-center">
						<h3 class="text-xl font-semibold mb-3">No scheduled jobs</h3>
						<p class="text-muted-foreground mb-6 max-w-sm mx-auto">
							Create a scheduled transfer to automate your transactions
						</p>
						<Button
							class="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
							@click="router.push(toRoute('scheduling-transfer'))"
						>
							Schedule Transfer
						</Button>
					</div>

					<div
						v-for="job in displayJobs"
						:key="job.id"
						class="group relative p-6 rounded-xl bg-muted/30 border border-border/40"
					>
						<div class="flex items-start justify-between">
							<!-- Job title and status -->
							<div class="flex items-center space-x-3">
								<div class="flex items-center space-x-2">
									<div
										:class="[
											'w-2 h-2 rounded-full',
											job.isEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400',
										]"
									></div>
									<h3 class="text-lg font-semibold text-foreground">
										Send {{ formatUnits(job.amount, job.tokenDecimals) }} {{ job.tokenSymbol }}
									</h3>
									<span class="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
										#{{ job.id }}
									</span>
								</div>
								<div class="flex items-center space-x-2">
									<Badge v-if="!job.isEnabled" variant="outline"> Disabled </Badge>
									<Badge v-else-if="isJobOverdue(job)" variant="destructive"> Overdue </Badge>
								</div>
							</div>

							<!-- Enable/Disable and Execute buttons -->
							<div v-if="!isJobCompleted(job)" class="flex items-center space-x-1">
								<Button
									v-if="job.isEnabled && isJobOverdue(job)"
									variant="ghost"
									size="sm"
									class="h-9 w-9 p-0 hover:bg-orange-500/10 text-orange-600 hover:text-orange-700"
									@click="onClickExecute(job.id)"
									title="Execute now"
								>
									<Zap class="w-4 h-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="h-9 w-9 p-0 hover:bg-muted/60"
									@click="onClickJobAction(job.id, job.isEnabled ? 'disable' : 'enable')"
									:title="job.isEnabled ? 'Disable' : 'Enable'"
								>
									<Pause v-if="job.isEnabled" class="w-4 h-4" />
									<Play v-else class="w-4 h-4" />
								</Button>
							</div>
						</div>

						<!-- Destination -->
						<div class="flex items-center space-x-2 mb-2">
							<span class="text-sm text-muted-foreground">To:</span>
							<div class="flex items-center space-x-1">
								<code class="px-2 py-1 bg-muted/50 rounded-md text-sm font-mono">
									{{ shortenAddress(job.recipient) }}
								</code>
								<CopyButton :address="job.recipient" />
							</div>
						</div>

						<!-- Schedule Info -->
						<div class="mt-2 flex flex-col space-y-2">
							<!-- Interval -->
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-2">
									<Clock class="w-4 h-4 text-muted-foreground" />
									<span class="text-xs font-medium text-muted-foreground">
										{{ formatInterval(job.executeInterval) }}
									</span>
								</div>
								<div class="text-xs text-muted-foreground">Started {{ formatDate(job.startDate) }}</div>
							</div>

							<!-- Progress -->
							<div class="flex">
								<span class="text-base font-medium">
									{{ job.numberOfExecutionsCompleted }} of {{ job.numberOfExecutions }} executions
								</span>
							</div>

							<!-- Last execution and next execution -->
							<div class="flex flex-col text-xs text-muted-foreground">
								<div>Last execution: {{ displayLastExecutionTime(job.lastExecutionTime) }}</div>
								<div v-if="job.numberOfExecutionsCompleted < job.numberOfExecutions">
									<span v-if="job.isEnabled"> Next execution: {{ formatNextExecution(job) }} </span>
									<span v-else> Job is paused - will start when resumed </span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped></style>
