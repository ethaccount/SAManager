import { SUPPORTED_VALIDATION_OPTIONS, ValidationIdentifier } from '@/stores/validation/validation'
import { JsonRpcProvider } from 'ethers'
import {
	ADDRESS,
	BICONOMY_ATTESTER_ADDRESS,
	EntryPointVersion,
	EOAValidatorModule,
	KernelV3Account,
	NexusAccount,
	NexusCreationOptions,
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579Account,
	Safe7579CreationOptions,
	WebAuthnValidatorModule,
} from 'sendop'
import { CHAIN_ID } from './network'
import { deserializePasskeyCredential } from './passkey'

export type ImportedAccount = {
	accountId: AccountId
	category: AccountCategory
	address: string
	chainId: CHAIN_ID
	vOptions: ValidationIdentifier[]
	initCode: string | null
}

export type AccountCategory = 'Smart Account' | 'Smart EOA'

export enum AccountId {
	'kernel.advanced.v0.3.1' = 'kernel.advanced.v0.3.1',
	'biconomy.nexus.1.0.2' = 'biconomy.nexus.1.0.2',
	'rhinestone.safe7579.v1.0.0' = 'rhinestone.safe7579.v1.0.0',
	'infinitism.Simple7702Account.0.8.0' = 'infinitism.Simple7702Account.0.8.0',
	'infinitism.SimpleAccount.0.8.0' = 'infinitism.SimpleAccount.0.8.0',
}

export const ACCOUNT_ID_TO_NAME: Record<AccountId, string> = {
	[AccountId['kernel.advanced.v0.3.1']]: 'Kernel',
	[AccountId['biconomy.nexus.1.0.2']]: 'Nexus',
	[AccountId['rhinestone.safe7579.v1.0.0']]: 'Safe7579',
	[AccountId['infinitism.Simple7702Account.0.8.0']]: 'Simple7702Account',
	[AccountId['infinitism.SimpleAccount.0.8.0']]: 'SimpleAccount',
}

export const SUPPORTED_ACCOUNTS: Record<
	AccountId,
	{
		entryPointVersion: EntryPointVersion
		isModular: boolean
		onlySmartEOA: boolean
	}
> = {
	[AccountId['kernel.advanced.v0.3.1']]: {
		entryPointVersion: 'v0.7',
		isModular: true,
		onlySmartEOA: false,
	},
	[AccountId['biconomy.nexus.1.0.2']]: {
		entryPointVersion: 'v0.7',
		isModular: true,
		onlySmartEOA: false,
	},
	[AccountId['rhinestone.safe7579.v1.0.0']]: {
		entryPointVersion: 'v0.7',
		isModular: true,
		onlySmartEOA: false,
	},
	[AccountId['infinitism.SimpleAccount.0.8.0']]: {
		entryPointVersion: 'v0.8',
		isModular: false,
		onlySmartEOA: false,
	},
	[AccountId['infinitism.Simple7702Account.0.8.0']]: {
		entryPointVersion: 'v0.8',
		isModular: false,
		onlySmartEOA: true,
	},
}

export function displayAccountName(accountId: AccountId) {
	return ACCOUNT_ID_TO_NAME[accountId]
}

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
			validatorInitData = EOAValidatorModule.getInitData(validation.identifier)
			break
		case 'Passkey':
			const credential = deserializePasskeyCredential(validation.identifier)
			validatorAddress = SUPPORTED_VALIDATION_OPTIONS['Passkey'].validatorAddress
			validatorInitData = WebAuthnValidatorModule.getInitData({
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
