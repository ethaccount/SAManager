import { ValidationAPI } from 'sendop'
import { SignerType } from './Signer'

export type ValidationMethodName = 'ECDSAValidator' | 'OwnableValidator' | 'WebAuthnValidator' | 'Simple7702Account'
export type ValidationType = 'EOA_SINGLE' | 'PASSKEY'

export interface ValidationMethod {
	name: ValidationMethodName
	type: ValidationType
	signerType: SignerType
	validationAPI: ValidationAPI
	identifier: string

	serialize(): ValidationMethodData
}

export interface ValidationMethodData {
	name: ValidationMethodName
	identifier: string
}

export abstract class ValidationMethodBase implements ValidationMethod {
	abstract name: ValidationMethodName
	abstract type: ValidationType
	abstract signerType: SignerType
	abstract validationAPI: ValidationAPI

	constructor(public identifier: string) {}

	serialize(): ValidationMethodData {
		return {
			name: this.name,
			identifier: this.identifier,
		}
	}
}
