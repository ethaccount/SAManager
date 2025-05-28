import { SUPPORTED_SIGNER_TYPE } from '@/stores/validation/useSigner'
import { Contract, EventLog, isAddress, JsonRpcProvider } from 'ethers'
import { ADDRESS } from 'sendop'
import { getAuthenticatorIdHash } from '../passkey/passkeyNoRp'

export const SUPPORTED_VALIDATION_OPTIONS = {
	Passkey: {
		name: 'Passkey',
		description: 'Use WebAuthnValidator from zerodev',
		validatorAddress: ADDRESS.WebAuthnValidator,
		signerType: 'Passkey' as SUPPORTED_SIGNER_TYPE,
		async getAccounts(client: JsonRpcProvider, authenticatorIdHash: string): Promise<string[]> {
			const webAuthnValidator = new Contract(
				ADDRESS.WebAuthnValidator,
				[
					'event WebAuthnPublicKeyRegistered(address indexed kernel, bytes32 indexed authenticatorIdHash, uint256 pubKeyX, uint256 pubKeyY)',
				],
				client,
			)

			const events = (await webAuthnValidator.queryFilter(
				webAuthnValidator.filters.WebAuthnPublicKeyRegistered(null, authenticatorIdHash),
			)) as EventLog[]

			const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber)
			return sortedEvents.map(event => event.args[0]) as string[]
		},
	},
	'EOA-Owned': {
		name: 'EOA-Owned',
		description: 'Use ECDSAValidator from zerodev',
		validatorAddress: ADDRESS.ECDSAValidator,
		signerType: 'EOAWallet' as SUPPORTED_SIGNER_TYPE,

		async getAccounts(client: JsonRpcProvider, ownerAddress: string): Promise<string[]> {
			const validator = new Contract(
				ADDRESS.ECDSAValidator,
				['event OwnerRegistered(address indexed kernel, address indexed owner)'],
				client,
			)
			const events = (await validator.queryFilter(
				validator.filters.OwnerRegistered(null, ownerAddress),
			)) as EventLog[]

			const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber)
			return sortedEvents.map(event => event.args[0]) as string[]
		},
	},
	SmartEOA: {
		name: 'Smart EOA',
		description: 'Smart EOA validation for Simple7702Account',
		validatorAddress: null,
		signerType: 'EOAWallet' as SUPPORTED_SIGNER_TYPE,
	},
} as const

export type ValidationType = keyof typeof SUPPORTED_VALIDATION_OPTIONS

export function displayValidationName(validationType: ValidationType): string {
	return SUPPORTED_VALIDATION_OPTIONS[validationType].name
}

export interface ValidationOption {
	type: ValidationType
	identifier: string // address for EOA, serialized credential for Passkey
}

export function displayValidationIdentifier(validationIdentifier: ValidationOption): string {
	switch (validationIdentifier.type) {
		case 'EOA-Owned':
			return validationIdentifier.identifier
		case 'Passkey':
			return getAuthenticatorIdHash(validationIdentifier.identifier)
		case 'SmartEOA':
			return validationIdentifier.identifier
	}
}

export function createEOAOwnedValidation(address: string): ValidationOption {
	if (!isAddress(address)) {
		throw new Error('createEOAOwnedValidation: Invalid address')
	}
	return {
		type: 'EOA-Owned',
		identifier: address,
	}
}

export function createPasskeyValidation(credentialId: string): ValidationOption {
	if (!credentialId) {
		throw new Error(`createPasskeyValidation: credentialId is empty string`)
	}

	return {
		type: 'Passkey',
		identifier: credentialId,
	}
}

export function createSmartEOAValidation(address: string): ValidationOption {
	if (!isAddress(address)) {
		throw new Error('createSmartEOAValidation: Invalid address')
	}

	return {
		type: 'SmartEOA',
		identifier: address,
	}
}
