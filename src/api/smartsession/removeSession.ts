import { ADDRESS, Execution, INTERFACES } from 'sendop'

export function removeSessionExecution(permissionId: string): Execution {
	return {
		to: ADDRESS.SmartSession,
		value: 0n,
		data: INTERFACES.SmartSession.encodeFunctionData('removeSession', [permissionId]),
	}
}
