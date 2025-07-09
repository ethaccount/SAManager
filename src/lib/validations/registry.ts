import { ValidationMethod, ValidationMethodData, ValidationMethodName } from './ValidationMethod'
import {
	ECDSAValidatorVMethod,
	Simple7702AccountVMethod,
	SingleOwnableValidatorVMethod,
	WebAuthnValidatorVMethod,
} from './vMethods'

export interface ValidationMethodFactory {
	create(data: ValidationMethodData): ValidationMethod
}

export class ValidationMethodRegistry {
	private static readonly registry = new Map<ValidationMethodName, ValidationMethodFactory>()

	static register(name: ValidationMethodName, factory: ValidationMethodFactory): void {
		this.registry.set(name, factory)
	}

	static create(data: ValidationMethodData): ValidationMethod {
		const factory = this.registry.get(data.name)
		if (!factory) {
			throw new Error(`Unknown validation method: ${data.name}`)
		}
		return factory.create(data)
	}

	static getRegisteredMethods(): ValidationMethodName[] {
		return Array.from(this.registry.keys())
	}
}

// Auto-register all validation methods
ValidationMethodRegistry.register('ECDSAValidator', {
	create: data => {
		if (data.name !== 'ECDSAValidator') throw new Error('Invalid data type for ECDSAValidator')
		return new ECDSAValidatorVMethod(data.address)
	},
})

ValidationMethodRegistry.register('WebAuthnValidator', {
	create: data => {
		if (data.name !== 'WebAuthnValidator') throw new Error('Invalid data type for WebAuthnValidator')
		return new WebAuthnValidatorVMethod(data.credentialId, data.pubKeyX, data.pubKeyY, data.username)
	},
})

ValidationMethodRegistry.register('OwnableValidator', {
	create: data => {
		if (data.name !== 'OwnableValidator') throw new Error('Invalid data type for OwnableValidator')
		return new SingleOwnableValidatorVMethod(data.address)
	},
})

ValidationMethodRegistry.register('Simple7702Account', {
	create: data => {
		if (data.name !== 'Simple7702Account') throw new Error('Invalid data type for Simple7702Account')
		return new Simple7702AccountVMethod(data.address)
	},
})
