import { ADDRESS } from 'sendop'

export const SUPPORTED_VALIDATION_OPTIONS = {
	'EOA-Owned': {
		name: 'EOA Wallet',
		description: 'EOA-owned smart account validation',
		validatorAddress: ADDRESS.OwnableValidator,
	},
	Passkey: {
		name: 'Passkey',
		description: 'Passkey validation',
		validatorAddress: ADDRESS.WebAuthnValidator,
	},
} as const

export type ValidationType = keyof typeof SUPPORTED_VALIDATION_OPTIONS

export interface ValidationIdentifier {
	type: ValidationType
	identifier: string // address for EOA, authenticatorIdHash for Passkey
}
