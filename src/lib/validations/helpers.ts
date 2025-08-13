import { getOwnableValidator } from '@rhinestone/module-sdk'
import { ERC7579_MODULE_TYPE, ERC7579Module, getECDSAValidator, getWebAuthnValidator } from 'sendop'
import { ValidationMethodRegistry } from './registry'
import { ValidationMethod, ValidationMethodData, ValidationMethodName, ValidationType } from './ValidationMethod'

export function deserializeValidationMethod(data: ValidationMethodData): ValidationMethod {
	return ValidationMethodRegistry.create(data)
}

export function serializeValidationMethod(method: ValidationMethod): ValidationMethodData {
	return method.serialize()
}

export function getVMethodName(data: ValidationMethodData): ValidationMethodName {
	return data.name
}

export function getVMethodType(data: ValidationMethodData): ValidationType {
	return ValidationMethodRegistry.create(data).type
}

export function getVMethodValidatorAddress(data: ValidationMethodData): string | undefined {
	return ValidationMethodRegistry.create(data).validatorAddress
}

export function getVMethodIdentifier(data: ValidationMethodData): string {
	return ValidationMethodRegistry.create(data).identifier
}

export function getModuleByValidationMethod(validation: ValidationMethod): ERC7579Module {
	switch (validation.name) {
		case 'ECDSAValidator':
			return getECDSAValidator({
				ownerAddress: validation.identifier,
			})
		case 'WebAuthnValidator': {
			// Type cast to ensure we have the right data structure
			const webAuthnData = validation.serialize()
			if (webAuthnData.name !== 'WebAuthnValidator') {
				throw new Error('[getModuleByValidationMethod] Invalid validation method data for WebAuthnValidator')
			}

			// Check if public keys are available
			if (!webAuthnData.pubKeyX || !webAuthnData.pubKeyY) {
				throw new Error(
					`[getModuleByValidationMethod] pubKeyX and pubKeyY are required in the WebAuthnValidator method`,
				)
			}

			return getWebAuthnValidator({
				pubKeyX: webAuthnData.pubKeyX,
				pubKeyY: webAuthnData.pubKeyY,
				// Fix: The vMethod identifier is the authenticatorIdHash. Don't hash it again.
				authenticatorIdHash: validation.identifier,
			})
		}
		case 'OwnableValidator': {
			const m = getOwnableValidator({
				owners: [validation.identifier as `0x${string}`],
				threshold: 1,
			})
			return {
				address: m.address,
				type: ERC7579_MODULE_TYPE.VALIDATOR,
				initData: m.initData,
				deInitData: m.deInitData,
			}
		}
		default:
			throw new Error(`Unsupported validation method: ${validation.name}`)
	}
}
