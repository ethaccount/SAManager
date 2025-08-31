import { getAddress, isAddress } from 'ethers'
import { ADDRESS, isSameAddress, Simple7702AccountAPI, SingleEOAValidation, WebAuthnValidation } from 'sendop'
import {
	AppSigner,
	EOAValidationMethodData,
	MultiEOAValidationMethodData,
	SignerType,
	ValidationMethodBase,
	ValidationMethodName,
	ValidationType,
	WebAuthnValidationMethodData,
} from './types'

export class ECDSAValidatorVMethod extends ValidationMethodBase {
	name: ValidationMethodName = 'ECDSAValidator'
	type: ValidationType = 'EOA-Owned'
	signerType: SignerType = 'EOAWallet'
	validationAPI = new SingleEOAValidation()
	validatorAddress = ADDRESS.ECDSAValidator

	constructor(public address: string) {
		super()
		if (!isAddress(address)) throw new Error('[ECDSAValidatorVMethod] address is invalid')
		this.address = getAddress(address)
	}

	serialize(): EOAValidationMethodData {
		return {
			name: 'ECDSAValidator',
			type: 'EOA-Owned',
			address: this.address,
		}
	}

	isValidSigner(signer: AppSigner): boolean {
		return signer.type === this.signerType && this.isValidSignerIdentifier(signer.identifier)
	}

	isValidSignerIdentifier(identifier: string): boolean {
		return isSameAddress(identifier, this.address)
	}
}

export class WebAuthnValidatorVMethod extends ValidationMethodBase {
	name: ValidationMethodName = 'WebAuthnValidator'
	type: ValidationType = 'PASSKEY'
	signerType: SignerType = 'Passkey'
	validationAPI = new WebAuthnValidation()
	validatorAddress = ADDRESS.WebAuthnValidator

	constructor(
		public authenticatorIdHash: string,
		public pubKeyX?: bigint,
		public pubKeyY?: bigint,
		public username?: string,
	) {
		super()
		this.authenticatorIdHash = authenticatorIdHash
	}

	serialize(): WebAuthnValidationMethodData {
		return {
			name: 'WebAuthnValidator',
			type: 'PASSKEY',
			authenticatorIdHash: this.authenticatorIdHash,
			...(this.pubKeyX !== undefined && { pubKeyX: this.pubKeyX }),
			...(this.pubKeyY !== undefined && { pubKeyY: this.pubKeyY }),
			...(this.username !== undefined && { username: this.username }),
		}
	}

	isValidSigner(signer: AppSigner): boolean {
		return signer.type === this.signerType && this.isValidSignerIdentifier(signer.identifier)
	}

	isValidSignerIdentifier(identifier: string): boolean {
		return identifier === this.authenticatorIdHash
	}
}

export class OwnableValidatorVMethod extends ValidationMethodBase {
	name: ValidationMethodName = 'OwnableValidator'
	type: ValidationType = 'MULTI-EOA'
	signerType: SignerType = 'EOAWallet'
	validationAPI = new SingleEOAValidation()
	validatorAddress = ADDRESS.OwnableValidator

	public addresses: string[]
	public threshold: number

	constructor({ addresses, threshold }: { addresses: string[]; threshold: number }) {
		super()
		if (!Array.isArray(addresses) || addresses.length === 0)
			throw new Error('[OwnableValidatorVMethod] addresses is invalid')
		if (threshold <= 0) throw new Error('[OwnableValidatorVMethod] threshold is less than 1')
		if (addresses.length !== new Set(addresses).size)
			throw new Error('[OwnableValidatorVMethod] addresses has duplicates')
		if (addresses.some(address => !isAddress(address)))
			throw new Error('[OwnableValidatorVMethod] addresses has invalid addresses')

		this.addresses = addresses
		this.threshold = threshold
	}

	serialize(): MultiEOAValidationMethodData {
		return {
			name: 'OwnableValidator',
			type: 'MULTI-EOA',
			addresses: this.addresses,
			threshold: this.threshold,
		}
	}

	isValidSigner(signer: AppSigner): boolean {
		if (signer.type !== this.signerType) return false
		return this.isValidSignerIdentifier(signer.identifier)
	}

	isValidSignerIdentifier(identifier: string): boolean {
		return this.addresses.some(address => isSameAddress(address, identifier))
	}

	addOwner(owner: string) {
		if (!isAddress(owner)) throw new Error('[OwnableValidatorVMethod#addOwner] owner is invalid')
		if (this.addresses.some(address => isSameAddress(address, owner)))
			throw new Error('[OwnableValidatorVMethod#addOwner] owner already exists')
		this.addresses.push(owner)
	}

	removeOwner(owner: string) {
		if (!isAddress(owner)) throw new Error('[OwnableValidatorVMethod#removeOwner] owner is invalid')
		if (!this.addresses.some(address => isSameAddress(address, owner)))
			throw new Error('[OwnableValidatorVMethod#removeOwner] owner does not exist')
		this.addresses = this.addresses.filter(address => !isSameAddress(address, owner))
	}
}

export class Simple7702AccountVMethod extends ValidationMethodBase {
	name: ValidationMethodName = 'Simple7702Account'
	type: ValidationType = 'EOA-Owned'
	signerType: SignerType = 'EOAWallet'
	validationAPI = new Simple7702AccountAPI()

	constructor(public address: string) {
		super()
		if (!isAddress(address)) throw new Error('[Simple7702AccountVMethod] address is invalid')
		this.address = getAddress(address)
	}

	serialize(): EOAValidationMethodData {
		return {
			name: 'Simple7702Account',
			type: 'EOA-Owned',
			address: this.address,
		}
	}

	isValidSigner(signer: AppSigner): boolean {
		return signer.type === this.signerType && this.isValidSignerIdentifier(signer.identifier)
	}

	isValidSignerIdentifier(identifier: string): boolean {
		return isSameAddress(identifier, this.address)
	}
}
