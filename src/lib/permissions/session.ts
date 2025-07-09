import { env } from '@/app/useSetupEnv'
import { abiEncode, ADDRESS, getPermissionId, INTERFACES, isSameAddress } from 'sendop'
import { SessionStruct } from 'sendop/src/contract-types/SmartSession'

export type SessionData = {
	permissionId: string
	isEnabled: boolean
	sessionValidator: string
	sessionValidatorData: string
	enabledActions: string[]
	actionDetails: {
		description?: string
		actionId: string // keccak256(target address ++ functionSelector)
		isEnabled: boolean
		actionPolicies: string[] // policy address list
	}[]
}

// keccak (0xA8E374779aeE60413c974b484d6509c7E4DDb6bA ++ cast sig "executeOrder(uint256 jobId)")
export const SCHEDULED_TRANSFER_ACTION_ID = '0x40e16a6d796f8e99d12e7a1dd44c004750d18aed05cb13f66120ce076dcd7378'

// keccak (0x40dc90D670C89F322fa8b9f685770296428DCb6b ++ cast sig "executeOrder(uint256 jobId,uint160 sqrtPriceLimitX96,uint256 amountOutMinimum,uint24 fee)")
export const SCHEDULED_SWAP_ACTION_ID = '0xf16c27867fa317a4f55353ecd45c47adc3fb2baff9551fa397457de390962073'

export function getAppSessionValidatorInitData() {
	return abiEncode(['uint256', 'address[]'], [1, [env.SESSION_SIGNER_ADDRESS]]) // threshold, signers
}

export function createScheduledTransferSession() {
	console.log(env.APP_SALT)
	const session: SessionStruct = {
		sessionValidator: ADDRESS.OwnableValidator,
		sessionValidatorInitData: getAppSessionValidatorInitData(),
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

export function createScheduledSwapSession() {
	const session: SessionStruct = {
		sessionValidator: ADDRESS.OwnableValidator,
		sessionValidatorInitData: getAppSessionValidatorInitData(),
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
				actionTargetSelector: INTERFACES.ScheduledOrders.getFunction('executeOrder').selector,
				actionTarget: ADDRESS.ScheduledOrders,
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
			session.sessionValidatorData === getAppSessionValidatorInitData()
		) {
			return true
		}
	})
}

export function isScheduledSwapSession(session: SessionData) {
	return session.actionDetails.some(action => {
		if (
			action.actionId === SCHEDULED_SWAP_ACTION_ID &&
			action.actionPolicies.some(policy => isSameAddress(policy, ADDRESS.SudoPolicy)) &&
			isSameAddress(session.sessionValidator, ADDRESS.OwnableValidator) &&
			session.sessionValidatorData === getAppSessionValidatorInitData()
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

export function getScheduledSwapSessionStatus(session: SessionData): {
	isPermissionEnabled: boolean
	isActionEnabled: boolean
} {
	let isPermissionEnabled = false
	let isActionEnabled = false

	if (!isScheduledSwapSession(session)) return { isPermissionEnabled, isActionEnabled }

	// check session is enabled
	if (session.isEnabled) {
		isPermissionEnabled = true
	}

	// check action is enabled
	session.actionDetails.some(action => {
		if (action.actionId === SCHEDULED_SWAP_ACTION_ID && action.isEnabled) {
			isActionEnabled = true
		}
	})

	return { isPermissionEnabled, isActionEnabled }
}
