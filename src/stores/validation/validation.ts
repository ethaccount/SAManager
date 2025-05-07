import { ADDRESS } from 'sendop'

export type ValidationType = 'EOA-Owned' | 'Passkey'

export interface ValidationIdentifier {
	type: ValidationType
	identifier: string // address for EOA/Multisig, authenticatorIdHash for Passkey
}

export const SUPPORTED_VALIDATION_OPTIONS: Record<
	ValidationIdentifier['type'],
	{
		name: string
		description: string
		validatorAddress: string
	}
> = {
	'EOA-Owned': {
		name: 'EOA Wallet',
		description: 'Standard EOA wallet signature',
		validatorAddress: ADDRESS.OwnableValidator,
	},
	Passkey: {
		name: 'Passkey',
		description: 'Passkey validation',
		validatorAddress: ADDRESS.WebAuthnValidator,
	},
} as const
