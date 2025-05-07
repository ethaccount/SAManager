import { BytesLike } from 'ethers'
import { ADDRESS, EOAValidatorModule, WebAuthnValidatorModule } from 'sendop'

export type ValidationType = 'EOA-Owned' | 'Passkey' | 'Multisig'

export interface ValidationIdentifier {
	type: ValidationType
	value: string // address for EOA/Multisig, authenticatorIdHash for Passkey
}

export const SUPPORTED_VALIDATION_OPTIONS = {
	EOA: {
		type: 'EOA-Owned' as const,
		name: 'EOA Wallet',
		description: 'Standard EOA wallet signature',
		validatorAddress: ADDRESS.OwnableValidator,
		getInitData: (address: string) => EOAValidatorModule.getInitData(address),
	},
	WebAuthn: {
		type: 'Passkey' as const,
		name: 'Passkey',
		description: 'Passkey validation',
		validatorAddress: ADDRESS.WebAuthnValidator,
		getInitData: (options: { pubKeyX: bigint; pubKeyY: bigint; authenticatorIdHash: BytesLike }) =>
			WebAuthnValidatorModule.getInitData(options),
	},
	Multisig: {
		type: 'Multisig' as const,
		name: 'Multisig Wallet',
		description: 'Multisig wallet validation',
		validatorAddress: ADDRESS.OwnableValidator,
		getInitData: (address: string) => EOAValidatorModule.getInitData(address),
	},
} as const

export type SupportedValidationType = keyof typeof SUPPORTED_VALIDATION_OPTIONS
