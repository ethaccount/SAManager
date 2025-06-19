import { SessionData } from '@/lib/permissions/session'
import { ZeroAddress } from 'ethers'
import { isSameAddress, TSmartSession } from 'sendop'

export async function fetchSessions(accountAddress: string, smartsession: TSmartSession): Promise<SessionData[]> {
	const sessionCreatedEvents = await smartsession.queryFilter(smartsession.filters.SessionCreated())

	const sessions: SessionData[] = []

	for (const event of sessionCreatedEvents) {
		if (event.args.account === accountAddress) {
			const permissionId = event.args.permissionId

			const isPermissionEnabled = await smartsession.isPermissionEnabled(permissionId, accountAddress)

			const [sessionValidator, sessionValidatorData] = await smartsession.getSessionValidatorAndConfig(
				accountAddress,
				permissionId,
			)

			// Skip if session validator is zero address
			if (isSameAddress(sessionValidator, ZeroAddress)) {
				continue
			}

			const enabledActions = await smartsession.getEnabledActions(accountAddress, permissionId)

			// Get action details
			const actionDetails: Array<{
				actionId: string
				isEnabled: boolean
				actionPolicies: string[]
			}> = []
			for (const actionId of enabledActions) {
				const isActionIdEnabled = await smartsession.isActionIdEnabled(accountAddress, permissionId, actionId)

				const actionPolicies = await smartsession.getActionPolicies(accountAddress, permissionId, actionId)

				actionDetails.push({
					actionId,
					isEnabled: isActionIdEnabled,
					actionPolicies,
				})
			}

			sessions.push({
				permissionId,
				isEnabled: isPermissionEnabled,
				sessionValidator,
				sessionValidatorData,
				enabledActions,
				actionDetails,
			})
		}
	}

	return sessions
}
