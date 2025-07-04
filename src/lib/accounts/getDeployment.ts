import { AccountId } from '@/stores/account/account'
import { JsonRpcProvider } from 'ethers'
import {
	ADDRESS,
	BICONOMY_ATTESTER_ADDRESS,
	DEV_ATTESTER_ADDRESS,
	Kernel,
	Nexus,
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579,
} from 'sendop'
import { ValidationMethod } from '../validation-methods'

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
	if (!validation.module) {
		throw new Error('getDeployment: validation.module is undefined')
	}

	const validatorAddress = validation.module.address
	const validatorInitData = validation.module.initData

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
