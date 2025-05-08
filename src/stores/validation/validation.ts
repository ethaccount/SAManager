import { deserializePasskeyCredential, PasskeyCredential, serializePasskeyCredential } from '@/stores/passkey/passkey'
import { Contract, EventLog, isAddress, JsonRpcProvider } from 'ethers'
import { ADDRESS, isSameAddress } from 'sendop'
import { useValidation } from '@/stores/validation/useValidation'
import { shortenAddress } from '@vue-dapp/core'

export const SUPPORTED_VALIDATION_OPTIONS = {
	'EOA-Owned': {
		name: 'EOA-Owned',
		description: 'Use OwnableValidator from rhinestone',
		validatorAddress: ADDRESS.OwnableValidator,
		// TODO: Cannot get accounts from OwnableValidator, because it's event doens't have the owner address
		async getAccounts(client: JsonRpcProvider, _ownerAddress: string): Promise<string[]> {
			const ownableValidator = new Contract(
				ADDRESS.OwnableValidator,
				['event ModuleInitialized(address indexed account)'],
				client,
			)
			const events = (await ownableValidator.queryFilter(
				ownableValidator.filters.ModuleInitialized(),
			)) as EventLog[]

			const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber)
			return sortedEvents.slice(0, 5).map(event => event.args[0]) as string[]
		},
	},
	Passkey: {
		name: 'Passkey',
		description: 'Use WebAuthnValidator from zerodev',
		validatorAddress: ADDRESS.WebAuthnValidator,
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
			return sortedEvents.slice(0, 5).map(event => event.args[0]) as string[]
		},
	},
	SmartEOA: {
		name: 'Smart EOA',
		description: 'Smart EOA validation for Simple7702Account',
		validatorAddress: null,
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
