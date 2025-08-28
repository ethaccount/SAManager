import { TypedData, UserOpBuilder, ValidationAPI } from 'sendop'

export type SignerType = 'EOAWallet' | 'Passkey'

export interface AppSigner {
	type: SignerType
	identifier: string
	sign(userOp: UserOpBuilder): Promise<string>
	signHash(hash: Uint8Array): Promise<string>
	signTypedData(typedData: TypedData): Promise<string>
}

export type ValidationMethodName = 'ECDSAValidator' | 'OwnableValidator' | 'WebAuthnValidator' | 'Simple7702Account'
export type ValidationType = 'EOA-Owned' | 'PASSKEY' | 'MULTI-EOA'

// ValidationMethodData is the data format stored in local storage and can be restored to a ValidationMethod
export type ValidationMethodData = EOAValidationMethodData | WebAuthnValidationMethodData | MultiEOAValidationMethodData

export interface EOAValidationMethodData {
	name: 'ECDSAValidator' | 'Simple7702Account'
	type: 'EOA-Owned'
	address: string
}

export interface WebAuthnValidationMethodData {
	name: 'WebAuthnValidator'
	type: 'PASSKEY'
	authenticatorIdHash: string
	pubKeyX?: bigint
	pubKeyY?: bigint
	username?: string
}

export interface MultiEOAValidationMethodData {
	name: 'OwnableValidator'
	type: 'MULTI-EOA'
	addresses: string[]
	threshold: number
}

export interface ValidationMethod {
	name: ValidationMethodName
	type: ValidationType
	signerType: SignerType
	validationAPI: ValidationAPI

	validatorAddress?: string
	isModule: boolean

	serialize(): ValidationMethodData
	isValidSigner(signer: AppSigner): boolean
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

	abstract serialize(): ValidationMethodData
	abstract isValidSigner(signer: AppSigner): boolean
}
