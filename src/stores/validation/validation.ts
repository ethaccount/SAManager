import { SUPPORTED_SIGNER_TYPE } from '@/stores/validation/useSigner'
import { ADDRESS } from 'sendop'

export const SUPPORTED_VALIDATION_OPTIONS = {
	Passkey: {
		name: 'Passkey',
		description: 'Use WebAuthnValidator from zerodev',
		validatorAddress: ADDRESS.WebAuthnValidator,
		signerType: 'Passkey' as SUPPORTED_SIGNER_TYPE,
	},
	'EOA-Owned': {
		name: 'EOA-Owned',
		description: 'Use ECDSAValidator from zerodev',
		validatorAddress: ADDRESS.ECDSAValidator,
		signerType: 'EOAWallet' as SUPPORTED_SIGNER_TYPE,
	},
} as const
