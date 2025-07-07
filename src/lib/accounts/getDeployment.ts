import { ValidationMethod } from '@/lib/validations'
import { AccountId } from '@/stores/account/account'
import { JsonRpcProvider } from 'ethers'
import {
	ADDRESS,
	BICONOMY_ATTESTER_ADDRESS,
	DEV_ATTESTER_ADDRESS,
	ERC7579_MODULE_TYPE,
	ERC7579Module,
	getECDSAValidator,
	getWebAuthnValidator,
	Kernel,
	Nexus,
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579,
} from 'sendop'
import { getOwnableValidator } from '@rhinestone/module-sdk'

export type Deployment = {
	accountAddress: string
	factory: string
	factoryData: string
}

export async function getDeployment(
	client: JsonRpcProvider,
	accountId: AccountId,
	validation: ValidationMethod,
	salt: string,
): Promise<Deployment> {
	if (!validation.isModule) {
		throw new Error('getDeployment: Validation method is not a module')
	}

	let module: ERC7579Module

	switch (validation.name) {
		case 'ECDSAValidator': {
			module = getECDSAValidator({
				ownerAddress: validation.identifier,
			})
			break
		}
		case 'WebAuthnValidator': {
			module = getWebAuthnValidator({
				// TODO: get pubKeyX and pubKeyY from the validation method
				pubKeyX: BigInt(validation.identifier),
				pubKeyY: BigInt(validation.identifier),
				authenticatorIdHash: validation.identifier,
			})
			break
		}
		case 'OwnableValidator': {
			const m = getOwnableValidator({
				owners: [validation.identifier as `0x${string}`],
				threshold: 1,
			})
			module = {
				address: m.address,
				type: ERC7579_MODULE_TYPE.VALIDATOR,
				initData: m.initData,
				deInitData: m.deInitData,
			}
			break
		}
		default: {
			throw new Error(`getDeployment: Unsupported validation method: ${validation.name}`)
		}
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
					validatorAddress: module.address,
					validatorData: module.initData,
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
						validatorAddress: module.address,
						validatorInitData: module.initData,
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
						validatorAddress: module.address,
						validatorInitData: module.initData,
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
