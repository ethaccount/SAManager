import { env } from '@/app/useSetupEnv'
import { SESSION_SIGNER_ADDRESS } from '@/config'
import { abiEncode, ADDRESS, getPermissionId, INTERFACES, isSameAddress } from 'sendop'
import { SessionStruct, TSmartSession } from 'sendop/dist/src/contract-types/TSmartSession'

export type SessionData = {
	permissionId: string
	isEnabled: boolean
	sessionValidator: string
	sessionValidatorData: string
	enabledActions: string[]
	actionDetails: {
		actionId: string // keccak256(target address ++ functionSelector)
		isEnabled: boolean
		actionPolicies: string[] // policy address list
	}[]
}

// keccak 0xA8E374779aeE60413c974b484d6509c7E4DDb6bA ++ cast sig "executeOrder(uint256 jobId)"
export const SCHEDULED_TRANSFER_ACTION_ID = '0x40e16a6d796f8e99d12e7a1dd44c004750d18aed05cb13f66120ce076dcd7378'
export const APP_SESSION_VALIDATOR_INIT_DATA = abiEncode(['uint256', 'address[]'], [1, [SESSION_SIGNER_ADDRESS]]) // threshold, signers

export function createScheduledTransferSession() {
	const session: SessionStruct = {
		sessionValidator: ADDRESS.OwnableValidator,
		sessionValidatorInitData: APP_SESSION_VALIDATOR_INIT_DATA,
		salt: env.APP_SALT,
		userOpPolicies: [
			{
				policy: ADDRESS.SudoPolicy,
				initData: '0x',
			},
		],
		erc7739Policies: {
			erc1271Policies: [],
			allowedERC7739Content: [],
		},
		actions: [
			{
				actionTargetSelector: INTERFACES.ScheduledTransfers.getFunction('executeOrder').selector,
				actionTarget: ADDRESS.ScheduledTransfers,
				actionPolicies: [
					{
						policy: ADDRESS.SudoPolicy,
						initData: '0x',
					},
				],
			},
		],
		permitERC4337Paymaster: true,
	}
	const permissionId = getPermissionId(session)

	return {
		session,
		permissionId,
	}
}

export function isScheduledTransferSession(session: SessionData) {
	return session.actionDetails.some(action => {
		if (
			action.actionId === SCHEDULED_TRANSFER_ACTION_ID &&
			action.actionPolicies.some(policy => isSameAddress(policy, ADDRESS.SudoPolicy)) &&
			isSameAddress(session.sessionValidator, ADDRESS.OwnableValidator) &&
			session.sessionValidatorData === APP_SESSION_VALIDATOR_INIT_DATA
		) {
			return true
		}
	})
}

export function getScheduledTransferSessionStatus(session: SessionData): {
	isPermissionEnabled: boolean
	isActionEnabled: boolean
} {
	let isPermissionEnabled = false
	let isActionEnabled = false

	if (!isScheduledTransferSession(session)) return { isPermissionEnabled, isActionEnabled }

	// check session is enabled
	if (session.isEnabled) {
		isPermissionEnabled = true
	}

	// check action is enabled
	session.actionDetails.some(action => {
		if (action.actionId === SCHEDULED_TRANSFER_ACTION_ID && action.isEnabled) {
			isActionEnabled = true
		}
	})

	return { isPermissionEnabled, isActionEnabled }
}

export async function fetchSessions(accountAddress: string, smartsession: TSmartSession): Promise<SessionData[]> {
	const sessionCreatedEvents = await smartsession.queryFilter(smartsession.filters.SessionCreated())

	const sessions: SessionData[] = []

	for (const event of sessionCreatedEvents) {
		if (event.args.account === accountAddress) {
			const permissionId = event.args.permissionId

			// Get basic session info
			const isPermissionEnabled = await smartsession.isPermissionEnabled(permissionId, accountAddress)

			const [sessionValidator, sessionValidatorData] = await smartsession.getSessionValidatorAndConfig(
				accountAddress,
				permissionId,
			)

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
