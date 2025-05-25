import { SUPPORTED_VALIDATION_OPTIONS, ValidationOption } from '@/stores/validation/validation'
import { JsonRpcProvider } from 'ethers'
import {
	ADDRESS,
	BICONOMY_ATTESTER_ADDRESS,
	DEV_ATTESTER_ADDRESS,
	EOAValidator,
	KernelV3Account,
	NexusAccount,
	NexusCreationOptions,
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579Account,
	Safe7579CreationOptions,
	WebAuthnValidator,
} from 'sendop'
import { getAuthenticatorIdHash } from '../passkey/passkeyNoRp'
import { usePasskey } from '../passkey/usePasskey'
import { AccountId } from './account'

export async function checkIfAccountIsDeployed(client: JsonRpcProvider, address: string): Promise<boolean> {
	const code = await client.getCode(address)
	return code !== '0x'
}

/**
 * Get the computed address and init code for the account in Create Account page
 */
export async function getComputedAddressAndInitCode(
	client: JsonRpcProvider,
	accountId: AccountId,
	validation: ValidationOption,
	salt: string,
): Promise<{
	computedAddress: string
	initCode: string
}> {
	let computedAddress: string | null = null
	let initCode: string | null = null

	let validatorAddress: string
	let validatorInitData: string

	switch (validation.type) {
		case 'EOA-Owned':
			validatorAddress = SUPPORTED_VALIDATION_OPTIONS['EOA-Owned'].validatorAddress
			validatorInitData = EOAValidator.getInitData(validation.identifier)
			break
		case 'Passkey':
			const { selectedCredential, isFullCredential } = usePasskey()
			if (!isFullCredential.value || !selectedCredential.value) {
				throw new Error('getComputedAddressAndInitCode: selectedCredential is invalid')
			}
			validatorAddress = SUPPORTED_VALIDATION_OPTIONS['Passkey'].validatorAddress

			try {
				validatorInitData = WebAuthnValidator.getInitData({
					pubKeyX: BigInt(selectedCredential.value.pubKeyX),
					pubKeyY: BigInt(selectedCredential.value.pubKeyY),
					authenticatorIdHash: getAuthenticatorIdHash(selectedCredential.value.credentialId),
				})
			} catch (e: unknown) {
				throw new Error('getComputedAddressAndInitCode: WebAuthnValidator.getInitData', {
					cause: e,
				})
			}
			break
		default:
			throw new Error(`getComputedAddressAndInitCode: Unsupported validation type: ${validation.type}`)
	}

	try {
		switch (accountId) {
			case AccountId['kernel.advanced.v0.3.1']:
				{
					const creationOption = {
						salt,
						validatorAddress,
						validatorInitData,
					}
					console.log('kernel.advanced.v0.3.1 creationOption', creationOption)
					computedAddress = await KernelV3Account.computeAccountAddress(client, creationOption)
					initCode = KernelV3Account.getInitCode(creationOption)
				}
				break
			case AccountId['biconomy.nexus.1.0.2']:
				{
					const creationOption: NexusCreationOptions = {
						salt,
						validatorAddress,
						validatorInitData,
						bootstrap: 'initNexusWithSingleValidator',
						registryAddress: ADDRESS.Registry,
						attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS, DEV_ATTESTER_ADDRESS],
						threshold: 1,
					}
					console.log('biconomy.nexus.1.0.2 creationOption', creationOption)
					computedAddress = await NexusAccount.computeAccountAddress(client, creationOption)
					initCode = NexusAccount.getInitCode(creationOption)
				}
				break
			case AccountId['rhinestone.safe7579.v1.0.0']:
				{
					const creationOption: Safe7579CreationOptions = {
						salt,
						validatorAddress,
						validatorInitData,
						owners: [validation.identifier],
						ownersThreshold: 1,
						attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS, DEV_ATTESTER_ADDRESS],
						attestersThreshold: 1,
					}
					console.log('rhinestone.safe7579.v1.0.0 creationOption', creationOption)
					computedAddress = await Safe7579Account.computeAccountAddress(client, creationOption)
					initCode = Safe7579Account.getInitCode(creationOption)
				}
				break
		}

		if (!computedAddress) {
			throw new Error('computedAddress is falsy')
		}

		if (!initCode) {
			throw new Error('initCode is falsy')
		}
	} catch (e: unknown) {
		throw new Error(`Failed to compute account address and get init code`, {
			cause: e,
		})
	}

	return { computedAddress, initCode }
}
