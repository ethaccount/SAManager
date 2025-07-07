import { ValidationMethod } from '@/lib/validations'
import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { getOwnableValidator } from '@rhinestone/module-sdk'
import { hexlify } from 'ethers'
import { ERC7579_MODULE_TYPE, ERC7579Module, getECDSAValidator, getWebAuthnValidator } from 'sendop'
import { AccountRegistry } from './registry'
import { AccountId } from './types'

export function displayAccountName(accountId: AccountId) {
	return AccountRegistry.getConfig(accountId).name
}

export function isModularAccount(accountId: AccountId): boolean {
	return AccountRegistry.getConfig(accountId).isModular
}

export function getAccountEntryPointVersion(accountId: AccountId) {
	return AccountRegistry.getConfig(accountId).entryPointVersion
}

export function getValidationModule(validation: ValidationMethod): ERC7579Module {
	switch (validation.name) {
		case 'ECDSAValidator':
			return getECDSAValidator({
				ownerAddress: validation.identifier,
			})
		case 'WebAuthnValidator': {
			// TODO: here we use composable is very weird, we should use a better way to get the credential
			const { isFullCredential, selectedCredential } = usePasskey()
			if (!isFullCredential.value || !selectedCredential.value) {
				throw new Error('WebAuthnValidator: No full credential found')
			}
			return getWebAuthnValidator({
				pubKeyX: BigInt(hexlify(selectedCredential.value.pubKeyX)),
				pubKeyY: BigInt(hexlify(selectedCredential.value.pubKeyY)),
				authenticatorIdHash: getAuthenticatorIdHash(validation.identifier),
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
