import { ValidationMethodRegistry } from './registry'
import { ValidationMethod, ValidationMethodData } from './ValidationMethod'

export function deserializeValidationMethod(data: ValidationMethodData): ValidationMethod {
	return ValidationMethodRegistry.create(data)
}

export function serializeValidationMethod(method: ValidationMethod): ValidationMethodData {
	return method.serialize()
}
