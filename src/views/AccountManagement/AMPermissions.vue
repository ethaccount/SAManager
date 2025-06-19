<script setup lang="ts">
import { removeSessionExecution } from '@/api/smartsession/removeSession'
import { isScheduledSwapSession, isScheduledTransferSession, SessionData } from '@/lib/permissions/session'
import { useSessionList } from '@/lib/permissions/useSessionList'
import { ImportedAccount } from '@/stores/account/account'
import { useTxModal } from '@/stores/useTxModal'
import { shortenAddress } from '@vue-dapp/core'
import { Eye, EyeOff, Loader2, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const props = defineProps<{
	selectedAccount: ImportedAccount
	isDeployed: boolean
	isModular: boolean
}>()

const { sessions, loading, expandedSessions, loadSessions } = useSessionList()

onMounted(async () => {
	if (!props.isDeployed) return
	if (!props.isModular) return
	await loadSessions(props.selectedAccount.address)
})

function toggleSessionExpansion(permissionId: string) {
	if (expandedSessions.value.has(permissionId)) {
		expandedSessions.value.delete(permissionId)
	} else {
		expandedSessions.value.add(permissionId)
	}
}

async function onClickRemoveSession(permissionId: string) {
	if (!props.selectedAccount) {
		throw new Error('No account selected')
	}

	try {
		useTxModal().openModal({
			executions: [
				{
					description: `Remove session by permissionId ${shortenAddress(permissionId)}`,
					...removeSessionExecution(permissionId),
				},
			],
			onSuccess: async () => {
				toast.success('Session removed successfully')
				// Reload sessions to update the UI
				await loadSessions(props.selectedAccount.address)
			},
		})
	} catch (error) {
		console.error('Failed to remove session:', error)
		toast.error('Failed to remove session')
	}
}

function getSessionDisplayName(session: SessionData): string | undefined {
	if (isScheduledTransferSession(session)) return 'Scheduled Transfer'
	if (isScheduledSwapSession(session)) return 'Scheduled Swap'
	return undefined
}

const displaySessionList = computed(() => {
	return sessions.value.map(session => ({
		...session,
		sessionName: getSessionDisplayName(session),
	}))
})
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

				<div v-for="session in displaySessionList" :key="session.permissionId" class="border rounded-lg">
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
								<div class="flex items-center gap-2">
									<div class="font-medium">{{ shortenAddress(session.permissionId) }}</div>
									<CopyButton :address="session.permissionId" />
									<div v-if="session.sessionName" class="text-sm text-muted-foreground">
										({{ session.sessionName }})
									</div>
								</div>

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

							<Button
								variant="ghost"
								size="sm"
								@click.stop="onClickRemoveSession(session.permissionId)"
								class="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
							>
								<Trash2 class="w-4 h-4" />
							</Button>
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
												<span class="text-sm font-mono">
													{{ shortenAddress(action.actionId) }}
												</span>
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
