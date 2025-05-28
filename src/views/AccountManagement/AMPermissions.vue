<script setup lang="ts">
import { ImportedAccount } from '@/stores/account/account'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { shortenAddress } from '@vue-dapp/core'
import { Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { ADDRESS, TSmartSession__factory } from 'sendop'

const props = defineProps<{
	selectedAccount: ImportedAccount
	isDeployed: boolean
	isModular: boolean
}>()

const { tenderlyClient } = useBlockchain()

interface SessionData {
	permissionId: string
	isEnabled: boolean
	sessionValidator: string
	sessionValidatorData: string
	enabledActions: string[]
	actionDetails: Array<{
		actionId: string
		isEnabled: boolean
		actionPolicies: string[]
	}>
}

const sessions = ref<SessionData[]>([])
const loading = ref(false)
const expandedSessions = ref<Set<string>>(new Set())

const smartsession = computed(() => TSmartSession__factory.connect(ADDRESS.SmartSession, tenderlyClient.value))

onMounted(async () => {
	if (!props.isDeployed) return
	if (!props.isModular) return
	await loadSessions()
})

async function loadSessions() {
	loading.value = true
	try {
		const sessionCreatedEvents = await smartsession.value.queryFilter(smartsession.value.filters.SessionCreated())

		const accountSessions: SessionData[] = []

		for (const event of sessionCreatedEvents) {
			if (event.args.account === props.selectedAccount.address) {
				const permissionId = event.args.permissionId

				// Get basic session info
				const isPermissionEnabled = await smartsession.value.isPermissionEnabled(
					permissionId,
					props.selectedAccount.address,
				)

				const [sessionValidator, sessionValidatorData] = await smartsession.value.getSessionValidatorAndConfig(
					props.selectedAccount.address,
					permissionId,
				)

				const enabledActions = await smartsession.value.getEnabledActions(
					props.selectedAccount.address,
					permissionId,
				)

				// Get action details
				const actionDetails: Array<{
					actionId: string
					isEnabled: boolean
					actionPolicies: string[]
				}> = []
				for (const actionId of enabledActions) {
					const isActionIdEnabled = await smartsession.value.isActionIdEnabled(
						props.selectedAccount.address,
						permissionId,
						actionId,
					)

					const actionPolicies = await smartsession.value.getActionPolicies(
						props.selectedAccount.address,
						permissionId,
						actionId,
					)

					actionDetails.push({
						actionId,
						isEnabled: isActionIdEnabled,
						actionPolicies,
					})
				}

				accountSessions.push({
					permissionId,
					isEnabled: isPermissionEnabled,
					sessionValidator,
					sessionValidatorData,
					enabledActions,
					actionDetails,
				})
			}
		}

		sessions.value = accountSessions
	} catch (error) {
		console.error('Error loading sessions:', error)
	} finally {
		loading.value = false
	}
}

function toggleSessionExpansion(permissionId: string) {
	if (expandedSessions.value.has(permissionId)) {
		expandedSessions.value.delete(permissionId)
	} else {
		expandedSessions.value.add(permissionId)
	}
}
</script>

<template>
	<Card>
		<div class="space-y-6 p-6">
			<div v-if="!isDeployed" class="text-sm text-muted-foreground">Account is not deployed</div>
			<div v-else-if="!isModular" class="text-sm text-muted-foreground">Account is not modular</div>
			<div v-else-if="loading" class="flex justify-center py-8">
				<Loader2 class="w-6 h-6 animate-spin text-primary" />
			</div>

			<div v-else class="space-y-4">
				<div v-if="!sessions.length" class="text-center py-8 text-muted-foreground">
					No permissions found for this account
				</div>

				<div v-for="session in sessions" :key="session.permissionId" class="border rounded-lg">
					<!-- Session Header -->
					<div
						class="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
						@click="toggleSessionExpansion(session.permissionId)"
					>
						<div class="flex items-center gap-3">
							<div class="flex items-center gap-2">
								<Eye v-if="expandedSessions.has(session.permissionId)" class="w-4 h-4" />
								<EyeOff v-else class="w-4 h-4" />
							</div>
							<div>
								<div class="font-medium">{{ shortenAddress(session.permissionId) }}</div>
								<div class="text-sm text-muted-foreground">
									{{ session.enabledActions.length }} action(s)
								</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="text-xs rounded-full px-2.5 py-0.5"
								:class="
									session.isEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
								"
							>
								{{ session.isEnabled ? 'Enabled' : 'Disabled' }}
							</div>
							<CopyButton :address="session.permissionId" />
						</div>
					</div>

					<!-- Session Details -->
					<div v-if="expandedSessions.has(session.permissionId)" class="border-t bg-muted/20">
						<div class="p-4 space-y-4">
							<!-- Session Validator -->
							<div>
								<div class="text-sm font-medium mb-2">Session Validator</div>
								<div class="flex items-center gap-2 text-sm font-mono bg-card p-2 rounded border">
									<span>{{ shortenAddress(session.sessionValidator) }}</span>
									<CopyButton :address="session.sessionValidator" />
								</div>
							</div>

							<!-- Session Validator Data -->
							<div v-if="session.sessionValidatorData !== '0x'">
								<div class="text-sm font-medium mb-2">Validator Data</div>
								<div class="text-xs font-mono bg-card p-2 rounded border break-all">
									{{ session.sessionValidatorData }}
								</div>
							</div>

							<!-- Enabled Actions -->
							<div v-if="session.actionDetails.length > 0">
								<div class="text-sm font-medium mb-2">Enabled Actions</div>
								<div class="space-y-2">
									<div
										v-for="action in session.actionDetails"
										:key="action.actionId"
										class="bg-card p-3 rounded border"
									>
										<div class="flex items-center justify-between mb-2">
											<div class="flex items-center gap-2">
												<span class="text-sm font-mono">{{
													shortenAddress(action.actionId)
												}}</span>
												<CopyButton :address="action.actionId" />
											</div>
											<div
												class="text-xs rounded-full px-2 py-0.5"
												:class="
													action.isEnabled
														? 'bg-green-500/10 text-green-500'
														: 'bg-red-500/10 text-red-500'
												"
											>
												{{ action.isEnabled ? 'Enabled' : 'Disabled' }}
											</div>
										</div>

										<!-- Action Policies -->
										<div v-if="action.actionPolicies.length > 0">
											<div class="text-xs font-medium mb-1 text-muted-foreground">Policies:</div>
											<div class="space-y-1">
												<div
													v-for="(policy, index) in action.actionPolicies"
													:key="index"
													class="flex items-center gap-2 text-xs font-mono bg-muted/50 p-1.5 rounded"
												>
													<span>{{ shortenAddress(policy) }}</span>
													<CopyButton :address="policy" />
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Card>
</template>

<style lang="css" scoped></style>
