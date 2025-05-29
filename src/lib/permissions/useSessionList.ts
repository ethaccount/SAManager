import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { ADDRESS, TSmartSession__factory } from 'sendop'
import { SessionData } from './session'

export function useSessionList() {
	const { tenderlyClient } = useBlockchain()

	const sessions = ref<SessionData[]>([])
	const loading = ref(false)
	const error = ref<string | null>(null)
	const expandedSessions = ref<Set<string>>(new Set())

	const smartsession = computed(() => TSmartSession__factory.connect(ADDRESS.SmartSession, tenderlyClient.value))

	async function loadSessions(accountAddress: string) {
		error.value = null
		loading.value = true

		try {
			const sessionCreatedEvents = await smartsession.value.queryFilter(
				smartsession.value.filters.SessionCreated(),
			)

			const accountSessions: SessionData[] = []

			for (const event of sessionCreatedEvents) {
				if (event.args.account === accountAddress) {
					const permissionId = event.args.permissionId

					// Get basic session info
					const isPermissionEnabled = await smartsession.value.isPermissionEnabled(
						permissionId,
						accountAddress,
					)

					const [sessionValidator, sessionValidatorData] =
						await smartsession.value.getSessionValidatorAndConfig(accountAddress, permissionId)

					const enabledActions = await smartsession.value.getEnabledActions(accountAddress, permissionId)

					// Get action details
					const actionDetails: Array<{
						actionId: string
						isEnabled: boolean
						actionPolicies: string[]
					}> = []
					for (const actionId of enabledActions) {
						const isActionIdEnabled = await smartsession.value.isActionIdEnabled(
							accountAddress,
							permissionId,
							actionId,
						)

						const actionPolicies = await smartsession.value.getActionPolicies(
							accountAddress,
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
		} catch (e: unknown) {
			console.error('Error loading sessions:', e)
			error.value = e instanceof Error ? e.message : String(e)
		} finally {
			loading.value = false
		}
	}

	return {
		sessions,
		loading,
		expandedSessions,
		loadSessions,
	}
}
