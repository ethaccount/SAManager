import { deserializePasskeyCredential, PasskeyCredential, serializePasskeyCredential } from '@/stores/passkey/passkey'
import { isAddress } from 'ethers'
import { ADDRESS, isSameAddress } from 'sendop'
import { useValidation } from '@/stores/validation/useValidation'
import { shortenAddress } from '@vue-dapp/core'

export const SUPPORTED_VALIDATION_OPTIONS = {
	SmartEOA: {
		name: 'Smart EOA',
		description: 'Smart EOA validation for Simple7702Account',
		validatorAddress: null,
	},
	'EOA-Owned': {
		name: 'EOA-Owned',
		description: 'Use OwnableValidator from rhinestone',
		validatorAddress: ADDRESS.OwnableValidator,
	},
	Passkey: {
		name: 'Passkey',
		description: 'Use WebAuthnValidator from zerodev',
		validatorAddress: ADDRESS.WebAuthnValidator,
	},
} as const

export type ValidationType = keyof typeof SUPPORTED_VALIDATION_OPTIONS

export function displayValidationName(validationType: ValidationType): string {
	return SUPPORTED_VALIDATION_OPTIONS[validationType].name
}

export interface ValidationIdentifier {
	type: ValidationType
	identifier: string // address for EOA, authenticatorIdHash for Passkey
}

export function displayValidationIdentifier(validationIdentifier: ValidationIdentifier): string {
	switch (validationIdentifier.type) {
		case 'EOA-Owned':
			return shortenAddress(validationIdentifier.identifier)
		case 'Passkey':
			const credential = deserializePasskeyCredential(validationIdentifier.identifier)
			return shortenAddress(credential.authenticatorIdHash)
		case 'SmartEOA':
			return shortenAddress(validationIdentifier.identifier)
	}
}

export function createEOAOwnedValidation(address: string): ValidationIdentifier {
	if (!isAddress(address)) {
		throw new Error('createEOAOwnedValidation: Invalid address')
	}
	return {
		type: 'EOA-Owned',
		identifier: address,
	}
}

export function createPasskeyValidation(credential: PasskeyCredential): ValidationIdentifier {
	if (!credential) {
		throw new Error(`createPasskeyValidation: No credential provided`)
	}

	if (!credential.pubX || !credential.pubY) {
		throw new Error(`createPasskeyValidation: Invalid public key`)
	}

	if (!credential.authenticatorIdHash) {
		throw new Error(`createPasskeyValidation: No authenticatorIdHash provided`)
	}

	if (!credential.authenticatorId) {
		throw new Error(`createPasskeyValidation: No authenticatorId provided`)
	}

	return {
		type: 'Passkey',
		identifier: serializePasskeyCredential(credential),
	}
}

export function createSmartEOAValidation(address: string): ValidationIdentifier {
	if (!isAddress(address)) {
		throw new Error('createSmartEOAValidation: Invalid address')
	}

	return {
		type: 'SmartEOA',
		identifier: address,
	}
}

export function checkValidationAvailability(vOptions: ValidationIdentifier[]): boolean {
	const { selectedSigner } = useValidation()
	if (!selectedSigner.value) return false

	for (const vOption of vOptions) {
		switch (vOption.type) {
			case 'EOA-Owned':
			case 'SmartEOA':
				if (selectedSigner.value.type === 'EOA-Owned' || selectedSigner.value.type === 'SmartEOA') {
					if (isSameAddress(selectedSigner.value.identifier, vOption.identifier)) {
						return true
					}
				}
				break
			case 'Passkey':
				if (selectedSigner.value.type === 'Passkey') {
					if (selectedSigner.value.identifier === vOption.identifier) {
						return true
					}
				}
				break
		}
	}

	return false
}
