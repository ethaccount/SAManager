import { ValidationAPI } from 'sendop'
import { SignerType } from './Signer'

export type ValidationMethodName = 'ECDSAValidator' | 'OwnableValidator' | 'WebAuthnValidator' | 'Simple7702Account'
export type ValidationType = 'EOA-Owned' | 'PASSKEY'

// Discriminated union types for different validation method data
export interface EOAValidationMethodData {
	name: 'ECDSAValidator' | 'OwnableValidator' | 'Simple7702Account'
	address: string
}

export interface WebAuthnValidationMethodData {
	name: 'WebAuthnValidator'
	credentialId: string
	pubKeyX?: bigint
	pubKeyY?: bigint
}

export type ValidationMethodData = EOAValidationMethodData | WebAuthnValidationMethodData

export interface ValidationMethod {
	name: ValidationMethodName
	type: ValidationType
	signerType: SignerType
	validationAPI: ValidationAPI
	identifier: string

	validatorAddress?: string
	isModule: boolean

	serialize(): ValidationMethodData
}

export abstract class ValidationMethodBase implements ValidationMethod {
	abstract name: ValidationMethodName
	abstract type: ValidationType
	abstract signerType: SignerType
	abstract validationAPI: ValidationAPI

	validatorAddress?: string

	get isModule(): boolean {
		return this.validatorAddress !== undefined
	}

	constructor(public identifier: string) {}

	// This will be overridden by subclasses with specific return types
	abstract serialize(): ValidationMethodData
}
