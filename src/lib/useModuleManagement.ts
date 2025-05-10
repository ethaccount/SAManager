import { AccountId } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useTxModal } from '@/stores/useTxModal'
import { BytesLike, JsonRpcProvider } from 'ethers'
import {
	ADDRESS,
	ERC7579_MODULE_TYPE,
	Execution,
	findPrevious,
	KernelV3Account,
	NexusAccount,
	OwnableValidator,
	Safe7579Account,
	SimpleInstallModuleConfig,
	SimpleUninstallModuleConfig,
	TISafe7579__factory,
	TNexus__factory,
	ValidatorKernelInstallModuleConfig,
	WebAuthnValidator,
	zeroPadLeft,
} from 'sendop'
import { toast } from 'vue-sonner'
import { useConnectSignerModal } from './useConnectSignerModal'
import { createEOAOwnedValidation, createPasskeyValidation } from '@/stores/validation/validation'
import { useAccountModule } from './useAccountModule'
import { useNetwork } from '@/stores/network/useNetwork'

export const MODULE_TYPE_LABELS = {
	[ERC7579_MODULE_TYPE.VALIDATOR]: 'Validator Modules',
	[ERC7579_MODULE_TYPE.EXECUTOR]: 'Executor Modules',
	[ERC7579_MODULE_TYPE.HOOK]: 'Hook Modules',
	[ERC7579_MODULE_TYPE.FALLBACK]: 'Fallback Modules',
} as const

export const SUPPORTED_MODULES = {
	OwnableValidator: {
		name: 'Ownable Validator',
		description: 'EOA-owned validation module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.OwnableValidator,
		disabled: false,
	},
	WebAuthnValidator: {
		name: 'WebAuthn Validator',
		description: 'Domain-bound authentication using Passkeys',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.WebAuthnValidator,
		disabled: false,
	},
	ECDSAValidator: {
		name: 'ECDSA Validator',
		description: 'ECDSA validation module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.ECDSAValidator,
		disabled: true,
	},
	SmartSession: {
		name: 'Smart Session',
		description: 'Smart Session module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.SmartSession,
		disabled: true,
	},
} as const

export type ModuleType = keyof typeof SUPPORTED_MODULES

export function useModuleManagement() {
	const { selectedAccount, isAccountConnected } = useAccount()
	const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
	const { client } = useNetwork()

	const isLoading = ref(false)

	async function operateValidator(
		operation: 'install' | 'uninstall',
		moduleType: ModuleType,
		options?: {
			onSuccess?: () => Promise<void>
		},
	) {
		const { onSuccess } = options || {}

		if (!isAccountConnected.value) {
			toast.info('Connect your account to operate modules')
			return
		}
		if (!selectedAccount.value) {
			throw new Error('No account selected')
		}

		isLoading.value = true

		try {
			let execution: Execution
			const { wallet } = useEOAWallet()

			switch (moduleType) {
				case 'OwnableValidator':
					if (operation === 'install') {
						if (!wallet.address) {
							toast.info('Connect EOA wallet to install validator')
							openConnectEOAWallet()
							return
						}

						execution = {
							to: selectedAccount.value.address,
							data: await getModuleOperationCallData('install', selectedAccount.value.accountId, {
								moduleType,
								ownerAddresses: [wallet.address],
							}),
							value: 0n,
						}

						useTxModal().openModal({
							executions: [execution],
							onSuccess: async () => {
								if (!wallet.address) {
									throw new Error('No wallet address found')
								}
								if (!selectedAccount.value) {
									throw new Error('No account selected')
								}
								selectedAccount.value.vOptions.push(createEOAOwnedValidation(wallet.address))
								await onSuccess?.()
							},
						})
					} else {
						execution = {
							to: selectedAccount.value.address,
							data: await getModuleOperationCallData('uninstall', selectedAccount.value.accountId, {
								moduleType,
								ownerAddresses: [wallet.address || ''],
								accountAddress: selectedAccount.value.address,
								client: client.value,
							}),
							value: 0n,
						}

						useTxModal().openModal({
							executions: [execution],
							onSuccess: async () => {
								if (!selectedAccount.value) {
									throw new Error('No account selected')
								}
								selectedAccount.value.vOptions = selectedAccount.value.vOptions.filter(
									v => v.type !== 'EOA-Owned',
								)
								await onSuccess?.()
							},
						})
					}
					break

				case 'WebAuthnValidator':
					const { isLogin, credential } = usePasskey()
					if (operation === 'install') {
						if (!isLogin.value) {
							toast.info('Login with Passkey to install validator')
							openConnectPasskeyBoth()
							return
						}

						if (!credential.value) {
							throw new Error('operateValidator: No credential found')
						}

						execution = {
							to: selectedAccount.value.address,
							data: await getModuleOperationCallData('install', selectedAccount.value.accountId, {
								moduleType,
								webauthnData: {
									pubKeyX: credential.value.pubX,
									pubKeyY: credential.value.pubY,
									authenticatorIdHash: credential.value.authenticatorIdHash,
								},
							}),
							value: 0n,
						}

						useTxModal().openModal({
							executions: [execution],
							onSuccess: async () => {
								if (!credential.value) {
									throw new Error('No credential found')
								}
								if (!selectedAccount.value) {
									throw new Error('No account selected')
								}
								selectedAccount.value.vOptions.push(createPasskeyValidation(credential.value))
								await onSuccess?.()
							},
						})
					} else {
						if (!credential.value) {
							throw new Error('operateValidator: No credential found for uninstall')
						}

						execution = {
							to: selectedAccount.value.address,
							data: await getModuleOperationCallData('uninstall', selectedAccount.value.accountId, {
								moduleType,
								webauthnData: {
									pubKeyX: credential.value.pubX,
									pubKeyY: credential.value.pubY,
									authenticatorIdHash: credential.value.authenticatorIdHash,
								},
								accountAddress: selectedAccount.value.address,
								client: client.value,
							}),
							value: 0n,
						}

						useTxModal().openModal({
							executions: [execution],
							onSuccess: async () => {
								if (!selectedAccount.value) {
									throw new Error('No account selected')
								}
								selectedAccount.value.vOptions = selectedAccount.value.vOptions.filter(
									v => v.type !== 'Passkey',
								)
								await onSuccess?.()
							},
						})
					}
					break

				default:
					throw new Error('operateValidator: Unsupported module type: ' + moduleType)
			}
		} catch (e: unknown) {
			throw e
		} finally {
			isLoading.value = false
		}
	}

	return {
		operateValidator,
		isLoading,
	}
}

type ValidatorConfig =
	| {
			moduleType: 'OwnableValidator'
			ownerAddresses: string[]
			accountAddress?: string
			client?: JsonRpcProvider
	  }
	| {
			moduleType: 'WebAuthnValidator'
			webauthnData: { pubKeyX: bigint; pubKeyY: bigint; authenticatorIdHash: BytesLike }
			accountAddress?: string
			client?: JsonRpcProvider
	  }

export async function getModuleOperationCallData(
	operation: 'install' | 'uninstall',
	accountId: AccountId,
	config: ValidatorConfig,
) {
	const moduleAddress = getModuleAddress(config.moduleType)
	const moduleConfig = {
		moduleType: ERC7579_MODULE_TYPE.VALIDATOR as const,
		moduleAddress,
	}

	// =============================== Install ===============================

	if (operation === 'install') {
		const initData = getModuleInitData(config)
		const installConfig:
			| ValidatorKernelInstallModuleConfig
			| SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> = {
			...moduleConfig,
			initData,
		}

		switch (accountId) {
			case AccountId['kernel.advanced.v0.3.1']:
				return KernelV3Account.encodeInstallModule(installConfig)
			case AccountId['biconomy.nexus.1.0.2']:
				return NexusAccount.encodeInstallModule(installConfig)
			case AccountId['rhinestone.safe7579.v1.0.0']:
				return Safe7579Account.encodeInstallModule(installConfig)
			default:
				throw new Error(`manageValidator: Unsupported account for install: ${accountId}`)
		}
	}

	// =============================== Uninstall ===============================

	const deInitData = getModuleDeInitData(config.moduleType)
	const uninstallConfig: SimpleUninstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> = {
		...moduleConfig,
		deInitData,
	}

	switch (accountId) {
		case AccountId['kernel.advanced.v0.3.1']:
			return KernelV3Account.encodeUninstallModule(uninstallConfig)
		case AccountId['biconomy.nexus.1.0.2']: {
			if (!config.accountAddress || !config.client) {
				throw new Error(
					'manageValidator: accountAddress and client are required for uninstall operations: ' + accountId,
				)
			}

			const nexus = TNexus__factory.connect(config.accountAddress, config.client)
			const validators = await nexus.getValidatorsPaginated(zeroPadLeft('0x01', 20), 10)
			const prev = findPrevious(validators.array, getModuleAddress(config.moduleType))
			return NexusAccount.encodeUninstallModule({
				...uninstallConfig,
				prev,
			})
		}
		case AccountId['rhinestone.safe7579.v1.0.0']: {
			if (!config.accountAddress || !config.client) {
				throw new Error(
					'manageValidator: accountAddress and client are required for uninstall operations: ' + accountId,
				)
			}

			const safe = TISafe7579__factory.connect(config.accountAddress, config.client)
			const validators = await safe.getValidatorsPaginated(zeroPadLeft('0x01', 20), 10)
			const prev = findPrevious(validators.array, getModuleAddress(config.moduleType))
			return Safe7579Account.encodeUninstallModule({
				...uninstallConfig,
				prev,
			})
		}
		default:
			throw new Error(`manageValidator: Unsupported account for uninstall: ${accountId}`)
	}
}

function getModuleAddress(moduleType: ModuleType): string {
	return SUPPORTED_MODULES[moduleType].address
}

function getModuleInitData(config: ValidatorConfig) {
	if (config.moduleType === 'OwnableValidator') {
		return OwnableValidator.getInitData(config.ownerAddresses, 1)
	}
	return WebAuthnValidator.getInitData(config.webauthnData)
}

function getModuleDeInitData(moduleType: 'OwnableValidator' | 'WebAuthnValidator') {
	if (moduleType === 'OwnableValidator') {
		return OwnableValidator.getDeInitData()
	}
	return WebAuthnValidator.getDeInitData()
}
