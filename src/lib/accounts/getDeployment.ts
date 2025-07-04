import { AccountId } from '@/stores/account/account'
import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { SUPPORTED_VALIDATION_OPTIONS, ValidationOption } from '@/stores/validation/validation'
import { JsonRpcProvider } from 'ethers'
import {
	ADDRESS,
	BICONOMY_ATTESTER_ADDRESS,
	DEV_ATTESTER_ADDRESS,
	EOAValidator,
	Kernel,
	Nexus,
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579,
	WebAuthnValidator,
} from 'sendop'

export type Deployment = {
	accountAddress: string
	factory: string
	factoryData: string
}

export async function getDeployment(
	client: JsonRpcProvider,
	accountId: AccountId,
	validation: ValidationOption,
	salt: string,
): Promise<Deployment> {
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
				throw new Error('getDeployment: selectedCredential is invalid')
			}
			validatorAddress = SUPPORTED_VALIDATION_OPTIONS['Passkey'].validatorAddress

			try {
				validatorInitData = WebAuthnValidator.getInitData({
					pubKeyX: BigInt(selectedCredential.value.pubKeyX),
					pubKeyY: BigInt(selectedCredential.value.pubKeyY),
					authenticatorIdHash: getAuthenticatorIdHash(selectedCredential.value.credentialId),
				})
			} catch (e: unknown) {
				throw new Error('getDeployment: WebAuthnValidator.getInitData', {
					cause: e,
				})
			}
			break
		default:
			throw new Error(`getDeployment: Unsupported validation type: ${validation.type}`)
	}

	let deployment: {
		accountAddress: string
		factory: string
		factoryData: string
	}

	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			{
				deployment = await Kernel.getDeployment({
					client,
					validatorAddress,
					validatorData: validatorInitData,
					salt,
				})
			}
			break
		case AccountId['biconomy.nexus.1.0.2']:
			{
				deployment = await Nexus.getDeployment({
					client,
					salt,
					creationOptions: {
						validatorAddress,
						validatorInitData,
						bootstrap: 'initNexusWithSingleValidator',
						registryAddress: ADDRESS.Registry,
						attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS, DEV_ATTESTER_ADDRESS],
						threshold: 1,
					},
				})
			}
			break
		case AccountId['rhinestone.safe7579.v1.0.0']:
			{
				deployment = await Safe7579.getDeployment({
					client,
					salt,
					creationOptions: {
						validatorAddress,
						validatorInitData,
						owners: [validation.identifier],
						ownersThreshold: 1,
						attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS, DEV_ATTESTER_ADDRESS],
						attestersThreshold: 1,
					},
				})
			}
			break
		default:
			throw new Error(`getDeployment: Unsupported accountId: ${accountId}`)
	}

	return deployment
}
