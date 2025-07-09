import { AccountId } from '@/lib/accounts'
import { getInstallModuleData, getUninstallModuleData } from '@/lib/accounts/account-specific'
import { ECDSAValidatorVMethod, WebAuthnValidatorVMethod } from '@/lib/validations'
import { useAccount } from '@/stores/account/useAccount'
import { useAccounts } from '@/stores/account/useAccounts'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { TxModalExecution, useTxModal } from '@/stores/useTxModal'
import { BytesLike, getBigInt, hexlify, JsonRpcProvider } from 'ethers'
import { ERC7579_MODULE_TYPE, getECDSAValidator, getWebAuthnValidator } from 'sendop'
import { toast } from 'vue-sonner'
import { useConnectSignerModal } from '../useConnectSignerModal'
import { ModuleType, SUPPORTED_MODULES } from './supported-modules'

export function useModuleManagement() {
	const { selectedAccount, isAccountAccessible } = useAccount()
	const { addValidationMethod, removeValidationMethod } = useAccounts()
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

		if (!isAccountAccessible.value) {
			toast.info('Please connect your account first')
			return
		}
		if (!selectedAccount.value) {
			throw new Error('No account selected')
		}

		isLoading.value = true

		try {
			let execution: TxModalExecution
			const { wallet } = useEOAWallet()

			switch (moduleType) {
				case 'ECDSAValidator':
					if (operation === 'install') {
						if (!wallet.address) {
							openConnectEOAWallet()
							return
						}

						execution = {
							description: 'Install ECDSAValidator',
							to: selectedAccount.value.address,
							data: await getValidatorOperationData('install', selectedAccount.value.accountId, {
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
								const vMethod = new ECDSAValidatorVMethod(wallet.address)
								addValidationMethod(selectedAccount.value, vMethod)
								await onSuccess?.()
							},
						})
					} else {
						execution = {
							description: 'Uninstall ECDSAValidator',
							to: selectedAccount.value.address,
							data: await getValidatorOperationData('uninstall', selectedAccount.value.accountId, {
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
								removeValidationMethod(selectedAccount.value, 'ECDSAValidator')
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
							description: 'Install WebAuthnValidator',
							to: selectedAccount.value.address,
							data: await getValidatorOperationData('install', selectedAccount.value.accountId, {
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

								// add the vMethod to the account
								const credential = selectedCredential.value
								const vMethod = new WebAuthnValidatorVMethod(
									credential.credentialId,
									getBigInt(hexlify(credential.pubKeyX)),
									getBigInt(hexlify(credential.pubKeyY)),
									credential.username,
								)
								addValidationMethod(selectedAccount.value, vMethod)
								await onSuccess?.()
							},
						})
					} else {
						// uninstall the validator
						if (!selectedCredential.value) {
							throw new Error('operateValidator: No credential found for uninstall')
						}

						execution = {
							description: 'Uninstall WebAuthnValidator',
							to: selectedAccount.value.address,
							data: await getValidatorOperationData('uninstall', selectedAccount.value.accountId, {
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

								if (!selectedCredential.value) {
									throw new Error('No credential found')
								}

								removeValidationMethod(selectedAccount.value, 'WebAuthnValidator')
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

async function getValidatorOperationData(
	operation: 'install' | 'uninstall',
	accountId: AccountId,
	config: ValidatorConfig,
) {
	const module = {
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: getModuleAddress(config.moduleType),
		initData: getModuleInitData(config),
		deInitData: getModuleDeInitData(config),
	}

	if (operation === 'install') {
		return getInstallModuleData(accountId, module)
	} else {
		if (!config.accountAddress) {
			throw new Error('accountAddress is required for uninstall')
		}
		if (!config.client) {
			throw new Error('client is required for uninstall')
		}
		return getUninstallModuleData(accountId, module, config.accountAddress, config.client)
	}
}

function getModuleAddress(moduleType: ModuleType): string {
	return SUPPORTED_MODULES[moduleType].address
}

function getModuleInitData(config: ValidatorConfig) {
	if (config.moduleType === 'ECDSAValidator') {
		return getECDSAValidator({ ownerAddress: config.ownerAddress }).initData
	}
	return getWebAuthnValidator({
		pubKeyX: config.webauthnData.pubKeyX,
		pubKeyY: config.webauthnData.pubKeyY,
		authenticatorIdHash: config.webauthnData.authenticatorIdHash,
	}).initData
}

function getModuleDeInitData(config) {
	if (config.moduleType === 'ECDSAValidator') {
		return getECDSAValidator({ ownerAddress: config.ownerAddress }).deInitData
	}
	return getWebAuthnValidator({
		pubKeyX: config.webauthnData.pubKeyX,
		pubKeyY: config.webauthnData.pubKeyY,
		authenticatorIdHash: config.webauthnData.authenticatorIdHash,
	}).deInitData
}
