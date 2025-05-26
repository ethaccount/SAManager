<script setup lang="ts">
import { toRoute } from '@/lib/router'
import { fetchJobs, Job } from '@/lib/scheduling'
import { useAccount } from '@/stores/account/useAccount'
import { useNetwork } from '@/stores/network/useNetwork'
import { Clock, Loader2, Pause, Play, Trash2 } from 'lucide-vue-next'

const router = useRouter()
const { selectedAccount } = useAccount()
const { client } = useNetwork()

const loading = ref(false)
const error = ref<string | null>(null)
const jobs = ref<Job[]>([])

onMounted(async () => {
	if (!selectedAccount.value) return

	try {
		loading.value = true
		jobs.value = await fetchJobs(client.value, selectedAccount.value.address)
	} catch (err) {
		console.error(err)
		error.value = err instanceof Error ? err.message : String(err)
	} finally {
		loading.value = false
	}
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
						v-for="job in jobs"
						:key="job.id"
						class="group relative p-6 rounded-xl bg-muted/30 border border-border/40 backdrop-blur-sm transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5"
					>
						<div class="flex items-start justify-between">
							<div class="flex items-center space-x-3">
								<div class="flex items-center space-x-2">
									<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
									<h3 class="text-lg font-semibold text-foreground">Send 0.1 ETH</h3>
								</div>
								<Badge
									variant="secondary"
									class="bg-green-500/10 text-green-600 border-green-500/20 font-medium"
								>
									Active
								</Badge>
							</div>
							<div
								class="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity"
							>
								<Button variant="ghost" size="sm" class="h-9 w-9 p-0 hover:bg-muted/60">
									<Pause class="w-4 h-4" />
								</Button>
								<Button variant="ghost" size="sm" class="h-9 w-9 p-0 hover:bg-muted/60">
									<Play class="w-4 h-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive"
								>
									<Trash2 class="w-4 h-4" />
								</Button>
							</div>
						</div>

						<!-- Destination -->
						<div class="flex items-center space-x-2 mb-2">
							<span class="text-sm text-muted-foreground">To:</span>
							<code class="px-2 py-1 bg-muted/50 rounded-md text-sm font-mono">0x1234...5678</code>
						</div>

						<!-- Schedule Info -->
						<div class="flex items-center space-x-4">
							<div class="flex items-center space-x-2">
								<Clock class="w-4 h-4 text-muted-foreground" />
								<span class="text-sm font-medium">Daily</span>
							</div>
							<div class="text-sm text-muted-foreground">Started Apr 1, 2023</div>
						</div>

						<!-- Progress Section -->
						<div class="mt-2">
							<div class="flex">
								<span class="text-sm text-muted-foreground">3 of 10 executions</span>
							</div>
							<div class="text-xs text-muted-foreground">Last execution: Apr 3, 2023</div>
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped></style>
