import { SCHEDULED_SWAP_ACTION_ID, SCHEDULED_TRANSFER_ACTION_ID, SessionData } from '@/lib/permissions/session'
import { isSameAddress, SmartSession } from 'sendop'

// event SessionCreated(PermissionId permissionId, address account);
// event SessionRemoved(PermissionId permissionId, address smartAccount);

export async function fetchSessions(
	accountAddress: string,
	smartsession: SmartSession,
	fromBlock?: number,
	toBlock?: number,
): Promise<SessionData[]> {
	const [sessionCreatedEvents, sessionRemovedEvents] = await Promise.all([
		smartsession.queryFilter(smartsession.filters.SessionCreated(), fromBlock, toBlock),
		smartsession.queryFilter(smartsession.filters.SessionRemoved(), fromBlock, toBlock),
	])

	// Create a set of removed permission IDs for this account
	const removedPermissionIds = new Set<string>()
	for (const event of sessionRemovedEvents) {
		if (isSameAddress(event.args.smartAccount, accountAddress)) {
			removedPermissionIds.add(event.args.permissionId)
		}
	}

	// Collect unique permission IDs for this account
	const uniquePermissionIds = new Set<string>()
	for (const event of sessionCreatedEvents) {
		if (isSameAddress(event.args.account, accountAddress)) {
			const permissionId = event.args.permissionId

			// Skip if this session has been removed
			if (!removedPermissionIds.has(permissionId)) {
				uniquePermissionIds.add(permissionId)
			}
		}
	}

	const sessions: SessionData[] = []

	// Process each unique permission ID
	for (const permissionId of uniquePermissionIds) {
		// check if permission is enabled
		const isPermissionEnabled = await smartsession.isPermissionEnabled(permissionId, accountAddress)

		const [sessionValidator, sessionValidatorData] = await smartsession.getSessionValidatorAndConfig(
			accountAddress,
			permissionId,
		)

		const enabledActions = await smartsession.getEnabledActions(accountAddress, permissionId)

		// Get action details
		const actionDetails: SessionData['actionDetails'] = []

		for (const actionId of enabledActions) {
			const isActionIdEnabled = await smartsession.isActionIdEnabled(accountAddress, permissionId, actionId)

			const actionPolicies = await smartsession.getActionPolicies(accountAddress, permissionId, actionId)

			actionDetails.push({
				description: getKnownActionIdName(actionId),
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

	return sessions
}

function getKnownActionIdName(actionId: string) {
	if (actionId === SCHEDULED_TRANSFER_ACTION_ID) {
		return 'Scheduled Transfer'
	}

	if (actionId === SCHEDULED_SWAP_ACTION_ID) {
		return 'Scheduled Swap'
	}

	return 'Unknown'
}
