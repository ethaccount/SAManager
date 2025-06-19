import { INTERFACES } from 'sendop'

export async function removeSessionCalldata(permissionId: string) {
	return INTERFACES.SmartSession.encodeFunctionData('removeSession', [permissionId])
}
