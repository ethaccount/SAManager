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
	create: data => new ECDSAValidatorVMethod(data.identifier),
})

ValidationMethodRegistry.register('WebAuthnValidator', {
	create: data => new WebAuthnValidatorVMethod(data.identifier),
})

ValidationMethodRegistry.register('OwnableValidator', {
	create: data => new SingleOwnableValidatorVMethod(data.identifier),
})

ValidationMethodRegistry.register('Simple7702Account', {
	create: data => new Simple7702AccountVMethod(data.identifier),
})
