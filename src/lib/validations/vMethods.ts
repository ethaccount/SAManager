import { getAddress } from 'ethers'
import { ADDRESS, Simple7702AccountAPI, SingleEOAValidation, WebAuthnValidation } from 'sendop'
import { SignerType } from './Signer'
import {
	ValidationMethodBase,
	ValidationMethodName,
	ValidationType,
	EOAValidationMethodData,
	WebAuthnValidationMethodData,
} from './ValidationMethod'

export class ECDSAValidatorVMethod extends ValidationMethodBase {
	name: ValidationMethodName = 'ECDSAValidator'
	type: ValidationType = 'EOA-Owned'
	signerType: SignerType = 'EOAWallet'
	validationAPI = new SingleEOAValidation()
	validatorAddress = ADDRESS.ECDSAValidator

	constructor(identifier: string) {
		super(getAddress(identifier))
	}

	serialize(): EOAValidationMethodData {
		return {
			name: 'ECDSAValidator',
			address: this.identifier,
		}
	}
}

export class WebAuthnValidatorVMethod extends ValidationMethodBase {
	name: ValidationMethodName = 'WebAuthnValidator'
	type: ValidationType = 'PASSKEY'
	signerType: SignerType = 'Passkey'
	validationAPI = new WebAuthnValidation()
	validatorAddress = ADDRESS.WebAuthnValidator

	constructor(
		identifier: string, // authenticatorIdHash
		public pubKeyX?: bigint,
		public pubKeyY?: bigint,
		public username?: string,
	) {
		super(identifier)
	}

	serialize(): WebAuthnValidationMethodData {
		return {
			name: 'WebAuthnValidator',
			authenticatorIdHash: this.identifier,
			...(this.pubKeyX !== undefined && { pubKeyX: this.pubKeyX }),
			...(this.pubKeyY !== undefined && { pubKeyY: this.pubKeyY }),
			...(this.username !== undefined && { username: this.username }),
		}
	}
}

export class SingleOwnableValidatorVMethod extends ValidationMethodBase {
	name: ValidationMethodName = 'OwnableValidator'
	type: ValidationType = 'EOA-Owned'
	signerType: SignerType = 'EOAWallet'
	validationAPI = new SingleEOAValidation()
	validatorAddress = ADDRESS.OwnableValidator

	constructor(identifier: string) {
		super(getAddress(identifier))
	}

	serialize(): EOAValidationMethodData {
		return {
			name: 'OwnableValidator',
			address: this.identifier,
		}
	}
}

export class Simple7702AccountVMethod extends ValidationMethodBase {
	name: ValidationMethodName = 'Simple7702Account'
	type: ValidationType = 'EOA-Owned'
	signerType: SignerType = 'EOAWallet'
	validationAPI = new Simple7702AccountAPI()

	constructor(identifier: string) {
		super(getAddress(identifier))
	}

	serialize(): EOAValidationMethodData {
		return {
			name: 'Simple7702Account',
			address: this.identifier,
		}
	}
}
