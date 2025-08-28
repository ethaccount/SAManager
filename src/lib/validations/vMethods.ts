import { getAddress, isAddress } from 'ethers'
import { ADDRESS, isSameAddress, Simple7702AccountAPI, SingleEOAValidation, WebAuthnValidation } from 'sendop'
import { AppSigner, SignerType } from './Signer'
import {
	EOAValidationMethodData,
	MultiEOAValidationMethodData,
	ValidationMethodBase,
	ValidationMethodName,
	ValidationType,
	WebAuthnValidationMethodData,
} from './ValidationMethod'

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
		return signer.type === this.signerType && isSameAddress(signer.identifier, this.address)
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
		return signer.type === this.signerType && signer.identifier === this.authenticatorIdHash
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
		if (addresses.length === 0) throw new Error('[OwnableValidatorVMethod] addresses is empty')
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
		return this.addresses.includes(signer.identifier)
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
		return signer.type === this.signerType && isSameAddress(signer.identifier, this.address)
	}
}
