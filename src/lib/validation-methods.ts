import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { SUPPORTED_SIGNER_TYPE } from '@/stores/validation/useSigner'
import { getOwnableValidator } from '@rhinestone/module-sdk'
import {
	ADDRESS,
	ERC7579_MODULE_TYPE,
	ERC7579Module,
	getECDSAValidator,
	getWebAuthnValidator,
	Simple7702AccountAPI,
	SingleEOAValidation,
	ValidationAPI,
	WebAuthnValidation,
} from 'sendop'

export interface ValidationMethod {
	name: ValidationMethodName
	validationAPI: ValidationAPI
	module?: ERC7579Module
	identifier: string
	signerType: SUPPORTED_SIGNER_TYPE
}

export type ValidationMethodName = 'ECDSAValidator' | 'OwnableValidator' | 'WebAuthnValidator' | 'Simple7702Account'

// Serializable representation of ValidationMethod for localStorage
export interface ValidationMethodData {
	name: ValidationMethodName
	identifier: string
	data: ValidationMethodSpecificData
	signerType: SUPPORTED_SIGNER_TYPE
}

export type ValidationMethodSpecificData =
	| { type: 'ECDSAValidator'; address: string }
	| { type: 'OwnableValidator'; address: string }
	| { type: 'WebAuthnValidator'; credential: { pubKeyX: string; pubKeyY: string; credentialId: string } }
	| { type: 'Simple7702Account'; address: string }

export class ECDSAValidatorVMethod implements ValidationMethod {
	static name: ValidationMethodName = 'ECDSAValidator'
	static description = 'The EOA-Owned validation from ZeroDev'

	signerType: SUPPORTED_SIGNER_TYPE = 'EOAWallet'

	get name() {
		return ECDSAValidatorVMethod.name
	}

	validationAPI = new SingleEOAValidation()
	module: ERC7579Module

	constructor(public address: string) {
		const module = getECDSAValidator({ ownerAddress: this.address })

		this.module = {
			address: module.address,
			type: ERC7579_MODULE_TYPE.VALIDATOR,
			initData: module.initData,
			deInitData: module.deInitData,
		}
	}

	get identifier() {
		return this.address
	}
}

export class OwnableValidatorSingleVMethod implements ValidationMethod {
	static name: ValidationMethodName = 'OwnableValidator'
	static description = 'The Multi-Owner validation from Rhinestone'

	signerType: SUPPORTED_SIGNER_TYPE = 'EOAWallet'

	get name() {
		return OwnableValidatorSingleVMethod.name
	}

	validationAPI = new SingleEOAValidation()
	module: ERC7579Module

	constructor(public address: string) {
		const module = getOwnableValidator({
			owners: [this.address as `0x${string}`],
			threshold: 1,
		})

		this.module = {
			address: module.address,
			type: ERC7579_MODULE_TYPE.VALIDATOR,
			initData: module.initData,
			deInitData: module.deInitData,
		}
	}

	get identifier() {
		return this.address
	}
}

export class WebAuthnValidatorVMethod implements ValidationMethod {
	static name: ValidationMethodName = 'WebAuthnValidator'
	static description = 'The Passkey validation from ZeroDev'

	signerType: SUPPORTED_SIGNER_TYPE = 'Passkey'

	get name() {
		return WebAuthnValidatorVMethod.name
	}

	validationAPI = new WebAuthnValidation()
	module: ERC7579Module

	constructor(
		public credential: {
			pubKeyX: string
			pubKeyY: string
			credentialId: string
		},
	) {
		const webAuthnValidator = getWebAuthnValidator({
			pubKeyX: BigInt(this.credential.pubKeyX),
			pubKeyY: BigInt(this.credential.pubKeyY),
			authenticatorIdHash: getAuthenticatorIdHash(this.credential.credentialId),
		})
		this.module = {
			address: ADDRESS.WebAuthnValidator,
			type: ERC7579_MODULE_TYPE.VALIDATOR,
			initData: webAuthnValidator.initData,
			deInitData: webAuthnValidator.deInitData,
		}
	}

	get identifier() {
		return this.credential.credentialId
	}
}

export class Simple7702ValidatorVMethod implements ValidationMethod {
	static name: ValidationMethodName = 'Simple7702Account'
	static description = 'The Simple7702Account validation from Infinitism'

	signerType: SUPPORTED_SIGNER_TYPE = 'EOAWallet'

	get name() {
		return Simple7702ValidatorVMethod.name
	}

	validationAPI = new Simple7702AccountAPI()

	constructor(public address: string) {}

	get identifier() {
		return this.address
	}
}

// Convert ValidationMethod to serializable data
export function serializeValidationMethod(method: ValidationMethod): ValidationMethodData {
	switch (method.name) {
		case 'ECDSAValidator':
			return {
				name: method.name,
				identifier: method.identifier,
				data: { type: 'ECDSAValidator', address: method.identifier },
				signerType: method.signerType,
			}
		case 'OwnableValidator':
			return {
				name: method.name,
				identifier: method.identifier,
				data: { type: 'OwnableValidator', address: method.identifier },
				signerType: method.signerType,
			}
		case 'WebAuthnValidator':
			const webAuthnMethod = method as WebAuthnValidatorVMethod
			return {
				name: method.name,
				identifier: method.identifier,
				data: {
					type: 'WebAuthnValidator',
					credential: webAuthnMethod.credential,
				},
				signerType: method.signerType,
			}
		case 'Simple7702Account':
			return {
				name: method.name,
				identifier: method.identifier,
				data: { type: 'Simple7702Account', address: method.identifier },
				signerType: method.signerType,
			}
		default:
			throw new Error(`Unsupported validation method: ${method.name}`)
	}
}

// Convert serializable data back to ValidationMethod instance
export function deserializeValidationMethod(data: ValidationMethodData): ValidationMethod {
	switch (data.data.type) {
		case 'ECDSAValidator':
			return new ECDSAValidatorVMethod(data.data.address)
		case 'OwnableValidator':
			return new OwnableValidatorSingleVMethod(data.data.address)
		case 'WebAuthnValidator':
			return new WebAuthnValidatorVMethod(data.data.credential)
		case 'Simple7702Account':
			return new Simple7702ValidatorVMethod(data.data.address)
		default:
			throw new Error(`Unsupported validation method data: ${JSON.stringify(data.data)}`)
	}
}
