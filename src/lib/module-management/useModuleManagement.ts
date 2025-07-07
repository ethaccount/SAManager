import { getInstallModuleData, getUninstallModuleData } from '@/lib/accounts/account-specific'
import { ECDSAValidatorVMethod, WebAuthnValidatorVMethod } from '@/lib/validations'
import { AccountId } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { useTxModal } from '@/stores/useTxModal'
import { BytesLike, hexlify, JsonRpcProvider } from 'ethers'
import { ERC7579_MODULE_TYPE, Execution, getECDSAValidator, getWebAuthnValidator } from 'sendop'
import { toast } from 'vue-sonner'
import { useConnectSignerModal } from '../useConnectSignerModal'
import { ModuleType, SUPPORTED_MODULES } from './module-constants'

export function useModuleManagement() {
	const { selectedAccount, isAccountAccessible } = useAccount()
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
							openConnectEOAWallet()
							return
						}

						execution = {
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
								selectedAccount.value.vMethods.push(vMethod.serialize())
								await onSuccess?.()
							},
						})
					} else {
						execution = {
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
								// TODO: this will cause problems
								selectedAccount.value.vMethods = selectedAccount.value.vMethods.filter(
									v => v.name !== 'ECDSAValidator',
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
								// add the vOption
								const vMethod = new WebAuthnValidatorVMethod(selectedCredential.value.credentialId)
								selectedAccount.value.vMethods.push(vMethod.serialize())
								await onSuccess?.()
							},
						})
					} else {
						if (!selectedCredential.value) {
							throw new Error('operateValidator: No credential found for uninstall')
						}

						execution = {
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
								// remove the vOption
								selectedAccount.value.vMethods = selectedAccount.value.vMethods.filter(
									v => v.name !== 'WebAuthnValidator',
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
