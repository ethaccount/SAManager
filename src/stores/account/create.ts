import { deserializePasskeyCredential } from '@/stores/passkey/passkey'
import { SUPPORTED_VALIDATION_OPTIONS, ValidationIdentifier } from '@/stores/validation/validation'
import { JsonRpcProvider } from 'ethers'
import {
	ADDRESS,
	BICONOMY_ATTESTER_ADDRESS,
	KernelV3Account,
	NexusAccount,
	NexusCreationOptions,
	OwnableValidator,
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579Account,
	Safe7579CreationOptions,
	WebAuthnValidator,
} from 'sendop'
import { AccountId } from './account'

export async function getComputedAddressAndInitCode(
	client: JsonRpcProvider,
	accountId: AccountId,
	validation: ValidationIdentifier,
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
			validatorInitData = OwnableValidator.getInitData([validation.identifier], 1)
			break
		case 'Passkey':
			const credential = deserializePasskeyCredential(validation.identifier)
			validatorAddress = SUPPORTED_VALIDATION_OPTIONS['Passkey'].validatorAddress
			validatorInitData = WebAuthnValidator.getInitData({
				pubKeyX: credential.pubX,
				pubKeyY: credential.pubY,
				authenticatorIdHash: credential.authenticatorIdHash,
			})
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
						attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
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
						attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
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
