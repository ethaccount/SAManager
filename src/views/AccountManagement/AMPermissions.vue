<script setup lang="ts">
import { removeSessionExecution } from '@/api/smartsession/removeSession'
import { useSessionList } from '@/lib/permissions/useSessionList'
import { ImportedAccount } from '@/stores/account/account'
import { useTxModal } from '@/stores/useTxModal'
import { shortenAddress } from '@vue-dapp/core'
import { Loader2, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const props = defineProps<{
	selectedAccount: ImportedAccount
	isDeployed: boolean
	isModular: boolean
}>()

const { sessions, loading, expandedSessions, loadSessions, error: loadSessionsError } = useSessionList()

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
				// Reload sessions to update the UI
				await loadSessions(props.selectedAccount.address)
			},
		})
	} catch (error) {
		console.error('Failed to remove session:', error)
		toast.error('Failed to remove session')
	}
}

const displaySessionList = computed(() => {
	return sessions.value
})
</script>

<template>
	<Card>
		<div class="space-y-6 p-6">
			<div v-if="!isDeployed" class="text-sm text-muted-foreground">Account is not deployed</div>
			<div v-else-if="!isModular" class="text-sm text-muted-foreground">Account is not modular</div>
			<div v-else-if="loading" class="flex justify-center items-center py-8">
				<Loader2 class="w-6 h-6 animate-spin text-primary" />
				<span class="ml-2 text-sm text-muted-foreground">Loading permissions...</span>
			</div>

			<div v-else class="space-y-4">
				<div v-if="loadSessionsError" class="error-section">
					{{ loadSessionsError }}
				</div>
				<div v-else-if="!sessions.length" class="text-center py-8 text-muted-foreground">
					No permissions found for this account
				</div>

				<div v-for="session in displaySessionList" :key="session.permissionId" class="border rounded-lg">
					<!-- Session Header -->
					<div
						class="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
						@click="toggleSessionExpansion(session.permissionId)"
					>
						<div class="flex items-center gap-3">
							<div>
								<div class="flex flex-col">
									<div class="text-xs text-muted-foreground">Permission ID:</div>
									<div class="flex items-center gap-2">
										<div class="font-medium text-sm">
											{{ shortenAddress(session.permissionId) }}
										</div>
										<CopyButton :address="session.permissionId" size="xs" />

										<div class="text-xs text-muted-foreground">
											{{ session.enabledActions.length }} action(s)
										</div>
									</div>
								</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
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
								<div class="text-xs text-muted-foreground">Session Validator</div>
								<div
									class="mt-1 flex items-center gap-2 text-xs font-mono bg-muted/50 p-1.5 rounded border"
								>
									<span class="text-xs font-mono">
										{{ shortenAddress(session.sessionValidator) }}
									</span>
									<CopyButton :address="session.sessionValidator" size="xs" />
								</div>
							</div>

							<!-- Session Validator Data -->
							<div v-if="session.sessionValidatorData !== '0x'">
								<div class="text-xs text-muted-foreground">Validator Data</div>
								<div class="mt-1 text-xs font-mono bg-muted/50 p-2 rounded border break-all">
									{{ session.sessionValidatorData }}
								</div>
							</div>

							<!-- Enabled Actions -->
							<div v-if="session.actionDetails.length > 0">
								<div class="text-sm font-medium">Enabled Actions</div>
								<div class="mt-2 space-y-2">
									<div
										v-for="action in session.actionDetails"
										:key="action.actionId"
										class="bg-card p-3 rounded border"
									>
										<div class="flex items-center justify-between mb-2">
											<!-- action description -->
											<div v-if="action.description" class="text-sm font-medium">
												{{ action.description }}
											</div>
										</div>

										<!-- Action ID -->
										<div class="flex items-center gap-2">
											<div class="text-xs font-medium mb-1 text-muted-foreground">Action ID:</div>
											<span class="text-xs font-mono">
												{{ shortenAddress(action.actionId) }}
											</span>
											<CopyButton :address="action.actionId" size="xs" />
										</div>

										<!-- Action Policies -->
										<div v-if="action.actionPolicies.length > 0">
											<div class="text-xs font-medium text-muted-foreground">Policies:</div>
											<div class="mt-1 space-y-1">
												<div
													v-for="(policy, index) in action.actionPolicies"
													:key="index"
													class="flex items-center gap-2 text-xs font-mono bg-muted/50 p-1.5 rounded border"
												>
													<span>{{ shortenAddress(policy) }}</span>
													<CopyButton :address="policy" size="xs" />
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
