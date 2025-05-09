import { AccountId } from '@/stores/account/account'
import { BytesLike } from 'ethers'
import {
	ADDRESS,
	ERC7579_MODULE_TYPE,
	KernelV3Account,
	NexusAccount,
	OwnableValidator,
	Safe7579Account,
	SimpleInstallModuleConfig,
	ValidatorKernelInstallModuleConfig,
	WebAuthnValidator,
} from 'sendop'

export const MODULE_TYPE_LABELS = {
	[ERC7579_MODULE_TYPE.VALIDATOR]: 'Validator Modules',
	[ERC7579_MODULE_TYPE.EXECUTOR]: 'Executor Modules',
	[ERC7579_MODULE_TYPE.HOOK]: 'Hook Modules',
	[ERC7579_MODULE_TYPE.FALLBACK]: 'Fallback Modules',
} as const

export const SUPPORTED_MODULES = [
	{
		name: 'Ownable Validator',
		description: 'EOA-owned validation module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.OwnableValidator,
		disabled: false,
	},
	{
		name: 'WebAuthn Validator',
		description: 'Domain-bound authentication using Passkeys',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.WebAuthnValidator,
		disabled: false,
	},
	{
		name: 'ECDSA Validator',
		description: 'ECDSA validation module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.ECDSAValidator,
		disabled: true,
	},
	{
		name: 'Smart Session',
		description: 'Smart Session module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.SmartSession,
		disabled: true,
	},
] as const

export function useModuleManagement() {
	return {}
}

export function installOwnableValidator(accountId: AccountId, ownerAddresses: string[]) {
	const config: ValidatorKernelInstallModuleConfig | SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> = {
		moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
		moduleAddress: ADDRESS.OwnableValidator,
		initData: OwnableValidator.getInitData(ownerAddresses, 1),
	}
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return KernelV3Account.encodeInstallModule(config)
		case AccountId['biconomy.nexus.1.0.2']:
			return NexusAccount.encodeInstallModule(config)
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return Safe7579Account.encodeInstallModule(config)
		default:
			throw new Error(`installOwnableValidator: Unsupported account: ${accountId}`)
	}
}

export function installWebAuthnValidator(
	accountId: AccountId,
	webauthnData: { pubKeyX: bigint; pubKeyY: bigint; authenticatorIdHash: BytesLike },
) {
	const config: ValidatorKernelInstallModuleConfig | SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> = {
		moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
		moduleAddress: ADDRESS.WebAuthnValidator,
		initData: WebAuthnValidator.getInitData(webauthnData),
	}
	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return KernelV3Account.encodeInstallModule(config)
		case AccountId['biconomy.nexus.1.0.2']:
			return NexusAccount.encodeInstallModule(config)
		case AccountId['rhinestone.safe7579.v1.0.0']:
			return Safe7579Account.encodeInstallModule(config)
		default:
			throw new Error(`installWebAuthnValidator: Unsupported account: ${accountId}`)
	}
}
