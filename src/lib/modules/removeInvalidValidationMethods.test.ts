import { ERC7579_MODULE_TYPE } from 'sendop'
import type { ValidationMethodData } from '../validations/types'
import { removeInvalidValidationMethods, type ModuleRecordModule } from './useAccountModule'

vi.mock('../validations', () => ({
	deserializeValidationMethod: vi.fn(),
}))

vi.mock('sendop', async () => {
	const actual = await vi.importActual('sendop')
	return {
		...actual,
		isSameAddress: vi.fn(),
	}
})

import { isSameAddress } from 'sendop'
import { deserializeValidationMethod } from '../validations'

const mockDeserializeValidationMethod = vi.mocked(deserializeValidationMethod)
const mockIsSameAddress = vi.mocked(isSameAddress)

describe('removeInvalidValidationMethods', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should keep validation methods that have matching validator modules', () => {
		// Mock validation method data
		const vMethods: ValidationMethodData[] = [
			{
				name: 'ECDSAValidator',
				type: 'EOA-Owned',
				address: '0x123',
			},
			{
				name: 'WebAuthnValidator',
				type: 'PASSKEY',
				authenticatorIdHash: 'hash123',
			},
		]

		// Mock installed validator modules
		const validators: ModuleRecordModule[] = [
			{
				type: ERC7579_MODULE_TYPE.VALIDATOR,
				address: '0xValidator1',
			},
			{
				type: ERC7579_MODULE_TYPE.VALIDATOR,
				address: '0xValidator2',
			},
		]

		// Mock deserialized validation methods
		mockDeserializeValidationMethod
			.mockReturnValueOnce({
				validatorAddress: '0xValidator1',
				name: 'ECDSAValidator',
				type: 'EOA-Owned',
				signerType: 'EOAWallet',
			} as any)
			.mockReturnValueOnce({
				validatorAddress: '0xValidator2',
				name: 'WebAuthnValidator',
				type: 'PASSKEY',
				signerType: 'Passkey',
			} as any)

		// Mock address comparison to return true for matches
		mockIsSameAddress.mockReturnValue(true)

		const result = removeInvalidValidationMethods(vMethods, validators)

		expect(result).toHaveLength(2)
		expect(result).toEqual(vMethods)
		expect(mockDeserializeValidationMethod).toHaveBeenCalledTimes(2)
		expect(mockIsSameAddress).toHaveBeenCalledTimes(2)
	})

	it('should remove validation methods that do not have matching validator modules', () => {
		const vMethods: ValidationMethodData[] = [
			{
				name: 'ECDSAValidator',
				type: 'EOA-Owned',
				address: '0x123',
			},
			{
				name: 'WebAuthnValidator',
				type: 'PASSKEY',
				authenticatorIdHash: 'hash123',
			},
		]

		const validators: ModuleRecordModule[] = [
			{
				type: ERC7579_MODULE_TYPE.VALIDATOR,
				address: '0xValidator1',
			},
		]

		// Mock first validation method to have matching validator
		mockDeserializeValidationMethod
			.mockReturnValueOnce({
				validatorAddress: '0xValidator1',
				name: 'ECDSAValidator',
			} as any)
			.mockReturnValueOnce({
				validatorAddress: '0xValidator2', // This won't match any installed validator
				name: 'WebAuthnValidator',
			} as any)

		// Mock address comparison - first one matches, second doesn't
		mockIsSameAddress
			.mockReturnValueOnce(true) // First validation method matches
			.mockReturnValueOnce(false) // Second validation method doesn't match

		const result = removeInvalidValidationMethods(vMethods, validators)

		expect(result).toHaveLength(1)
		expect(result[0]).toEqual(vMethods[0])
		expect(mockDeserializeValidationMethod).toHaveBeenCalledTimes(2)
		expect(mockIsSameAddress).toHaveBeenCalledTimes(2)
	})

	it('should keep validation methods that do not have a validator address', () => {
		const vMethods: ValidationMethodData[] = [
			{
				name: 'Simple7702Account',
				type: 'EOA-Owned',
				address: '0x123',
			},
		]

		const validators: ModuleRecordModule[] = []

		// Mock validation method without validatorAddress
		mockDeserializeValidationMethod.mockReturnValueOnce({
			validatorAddress: undefined, // No validator address
			name: 'Simple7702Account',
		} as any)

		const result = removeInvalidValidationMethods(vMethods, validators)

		expect(result).toHaveLength(1)
		expect(result).toEqual(vMethods)
		expect(mockDeserializeValidationMethod).toHaveBeenCalledTimes(1)
		expect(mockIsSameAddress).not.toHaveBeenCalled()
	})

	it('should handle empty validation methods array', () => {
		const vMethods: ValidationMethodData[] = []
		const validators: ModuleRecordModule[] = [
			{
				type: ERC7579_MODULE_TYPE.VALIDATOR,
				address: '0xValidator1',
			},
		]

		const result = removeInvalidValidationMethods(vMethods, validators)

		expect(result).toHaveLength(0)
		expect(result).toEqual([])
		expect(mockDeserializeValidationMethod).not.toHaveBeenCalled()
		expect(mockIsSameAddress).not.toHaveBeenCalled()
	})

	it('should handle empty validators array', () => {
		const vMethods: ValidationMethodData[] = [
			{
				name: 'ECDSAValidator',
				type: 'EOA-Owned',
				address: '0x123',
			},
		]
		const validators: ModuleRecordModule[] = []

		mockDeserializeValidationMethod.mockReturnValueOnce({
			validatorAddress: '0xValidator1',
			name: 'ECDSAValidator',
		} as any)

		const result = removeInvalidValidationMethods(vMethods, validators)

		expect(result).toHaveLength(0)
		expect(mockDeserializeValidationMethod).toHaveBeenCalledTimes(1)
		expect(mockIsSameAddress).not.toHaveBeenCalled()
	})

	it('should handle mixed validation methods (some with validators, some without)', () => {
		const vMethods: ValidationMethodData[] = [
			{
				name: 'ECDSAValidator',
				type: 'EOA-Owned',
				address: '0x123',
			},
			{
				name: 'Simple7702Account',
				type: 'EOA-Owned',
				address: '0x456',
			},
			{
				name: 'WebAuthnValidator',
				type: 'PASSKEY',
				authenticatorIdHash: 'hash123',
			},
		]

		const validators: ModuleRecordModule[] = [
			{
				type: ERC7579_MODULE_TYPE.VALIDATOR,
				address: '0xValidator1',
			},
		]

		mockDeserializeValidationMethod
			.mockReturnValueOnce({
				validatorAddress: '0xValidator1', // Matches
				name: 'ECDSAValidator',
			} as any)
			.mockReturnValueOnce({
				validatorAddress: undefined, // No validator address (keep)
				name: 'Simple7702Account',
			} as any)
			.mockReturnValueOnce({
				validatorAddress: '0xValidator2', // Doesn't match (remove)
				name: 'WebAuthnValidator',
			} as any)

		mockIsSameAddress
			.mockReturnValueOnce(true) // First method matches
			.mockReturnValueOnce(false) // Third method doesn't match

		const result = removeInvalidValidationMethods(vMethods, validators)

		expect(result).toHaveLength(2)
		expect(result).toEqual([vMethods[0], vMethods[1]])
		expect(mockDeserializeValidationMethod).toHaveBeenCalledTimes(3)
		expect(mockIsSameAddress).toHaveBeenCalledTimes(2)
	})

	it('should call isSameAddress with correct parameters', () => {
		const vMethods: ValidationMethodData[] = [
			{
				name: 'ECDSAValidator',
				type: 'EOA-Owned',
				address: '0x123',
			},
		]

		const validators: ModuleRecordModule[] = [
			{
				type: ERC7579_MODULE_TYPE.VALIDATOR,
				address: '0xValidator1',
			},
		]

		const validatorAddress = '0xMyValidator'
		mockDeserializeValidationMethod.mockReturnValueOnce({
			validatorAddress,
			name: 'ECDSAValidator',
		} as any)

		mockIsSameAddress.mockReturnValue(true)

		removeInvalidValidationMethods(vMethods, validators)

		expect(mockIsSameAddress).toHaveBeenCalledWith('0xValidator1', validatorAddress)
	})
})
