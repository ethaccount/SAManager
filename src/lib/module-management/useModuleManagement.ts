import { AccountId } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useTxModal } from '@/stores/useTxModal'
import { createEOAOwnedValidation, createPasskeyValidation } from '@/stores/validation/validation'
import { BytesLike, hexlify, JsonRpcProvider } from 'ethers'
import {
	EOAValidator,
	ERC7579_MODULE_TYPE,
	Execution,
	findPrevious,
	KernelV3Account,
	NexusAccount,
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
import { useConnectSignerModal } from '../useConnectSignerModal'
import { ModuleType, SUPPORTED_MODULES } from './module-constants'

export function useModuleManagement() {
	const { selectedAccount, isAccountConnected } = useAccount()
	const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
	const { client } = useBlockchain()

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
				case 'ECDSAValidator':
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
								ownerAddress: wallet.address,
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
								// add the vOption
								selectedAccount.value.vOptions.push(createEOAOwnedValidation(wallet.address))
								await onSuccess?.()
							},
						})
					} else {
						execution = {
							to: selectedAccount.value.address,
							data: await getModuleOperationCallData('uninstall', selectedAccount.value.accountId, {
								moduleType,
								ownerAddress: wallet.address || '',
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
								// remove the vOption
								selectedAccount.value.vOptions = selectedAccount.value.vOptions.filter(
									v => v.type !== 'EOA-Owned',
								)
								await onSuccess?.()
							},
						})
					}
					break

				case 'WebAuthnValidator':
					const { isLogin, selectedCredential } = usePasskey()
					if (operation === 'install') {
						if (!isLogin.value) {
							toast.info('Login with Passkey to install validator')
							openConnectPasskeyBoth()
							return
						}

						if (!selectedCredential.value) {
							throw new Error('operateValidator: No credential found')
						}

						execution = {
							to: selectedAccount.value.address,
							data: await getModuleOperationCallData('install', selectedAccount.value.accountId, {
								moduleType,
								webauthnData: {
									pubKeyX: BigInt(hexlify(selectedCredential.value.pubKeyX)),
									pubKeyY: BigInt(hexlify(selectedCredential.value.pubKeyY)),
									authenticatorIdHash: getAuthenticatorIdHash(selectedCredential.value.credentialId),
								},
							}),
							value: 0n,
						}

						useTxModal().openModal({
							executions: [execution],
							onSuccess: async () => {
								if (!selectedCredential.value) {
									throw new Error('No credential found')
								}
								if (!selectedAccount.value) {
									throw new Error('No account selected')
								}
								// add the vOption
								selectedAccount.value.vOptions.push(
									createPasskeyValidation(selectedCredential.value.credentialId),
								)
								await onSuccess?.()
							},
						})
					} else {
						if (!selectedCredential.value) {
							throw new Error('operateValidator: No credential found for uninstall')
						}

						execution = {
							to: selectedAccount.value.address,
							data: await getModuleOperationCallData('uninstall', selectedAccount.value.accountId, {
								moduleType,
								webauthnData: {
									pubKeyX: BigInt(hexlify(selectedCredential.value.pubKeyX)),
									pubKeyY: BigInt(hexlify(selectedCredential.value.pubKeyY)),
									authenticatorIdHash: getAuthenticatorIdHash(selectedCredential.value.credentialId),
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
								// remove the vOption
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
			moduleType: 'ECDSAValidator'
			ownerAddress: string
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
	if (config.moduleType === 'ECDSAValidator') {
		return EOAValidator.getInitData(config.ownerAddress)
	}
	return WebAuthnValidator.getInitData(config.webauthnData)
}

function getModuleDeInitData(moduleType: 'ECDSAValidator' | 'WebAuthnValidator') {
	if (moduleType === 'ECDSAValidator') {
		return EOAValidator.getDeInitData()
	}
	return WebAuthnValidator.getDeInitData()
}
