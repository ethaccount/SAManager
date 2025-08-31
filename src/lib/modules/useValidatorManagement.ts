import { getInstallModuleData, getUninstallModuleData } from '@/lib/accounts/account-specific'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { ECDSAValidatorVMethod, OwnableValidatorVMethod, WebAuthnValidatorVMethod } from '@/lib/validations'
import { getModuleByValidationMethod } from '@/lib/validations/helpers'
import { useAccount } from '@/stores/account/useAccount'
import { useAccounts } from '@/stores/account/useAccounts'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { TxModalExecution, useTxModal } from '@/stores/useTxModal'
import { getBigInt, hexlify } from 'ethers'
import { ADDRESS, ERC7579_MODULE_TYPE, ERC7579Module } from 'sendop'
import { toast } from 'vue-sonner'
import { DEPRECATED_WEB_AUTHN_VALIDATOR_ADDRESS } from '../addressToName'

export function useValidatorManagement() {
	const { selectedAccount, isAccountAccessible } = useAccount()
	const { addValidationMethod, removeValidationMethod } = useAccounts()
	const { openConnectEOAWallet, openConnectPasskeyBoth } = useConnectSignerModal()
	const { client } = useBlockchain()

	const isLoading = ref(false)

	// Common validation logic
	function validateAccountAccess() {
		if (!isAccountAccessible.value) {
			toast.info('Please connect your account first')
			return false
		}
		if (!selectedAccount.value) {
			throw new Error('No account selected')
		}
		return true
	}

	async function installValidatorModule(
		validationMethod: ECDSAValidatorVMethod | WebAuthnValidatorVMethod | OwnableValidatorVMethod,
		options?: {
			description?: string
			onSuccess?: () => Promise<void>
		},
	) {
		if (!validateAccountAccess()) return

		isLoading.value = true

		try {
			const module = getModuleByValidationMethod(validationMethod)

			const execution: TxModalExecution = {
				description: options?.description || `Install ${validationMethod.name}`,
				to: selectedAccount.value!.address,
				data: await getInstallModuleData(selectedAccount.value!.accountId, module),
				value: 0n,
			}

			useTxModal().openModal({
				executions: [execution],
				onSuccess: async () => {
					if (!selectedAccount.value) {
						throw new Error('No account selected')
					}

					addValidationMethod(selectedAccount.value, validationMethod)
					await options?.onSuccess?.()
				},
			})
		} catch (e: unknown) {
			throw e
		} finally {
			isLoading.value = false
		}
	}

	async function uninstallValidatorModule(
		moduleAddress: string,
		validationMethodName: 'ECDSAValidator' | 'WebAuthnValidator' | 'OwnableValidator',
		options?: {
			description?: string
			onSuccess?: () => Promise<void>
		},
	) {
		if (!validateAccountAccess()) return

		isLoading.value = true

		try {
			// For uninstall, we only need the module address and type, no init/deInit data
			const simpleModule: ERC7579Module = {
				address: moduleAddress,
				type: ERC7579_MODULE_TYPE.VALIDATOR,
				initData: '0x',
				deInitData: '0x',
			}

			const execution: TxModalExecution = {
				description: options?.description || `Uninstall ${validationMethodName}`,
				to: selectedAccount.value!.address,
				data: await getUninstallModuleData(
					selectedAccount.value!.accountId,
					simpleModule,
					selectedAccount.value!.address,
					client.value,
				),
				value: 0n,
			}

			useTxModal().openModal({
				executions: [execution],
				onSuccess: async () => {
					if (!selectedAccount.value) {
						throw new Error('No account selected')
					}
					removeValidationMethod(selectedAccount.value, validationMethodName)
					await options?.onSuccess?.()
				},
			})
		} catch (e: unknown) {
			throw e
		} finally {
			isLoading.value = false
		}
	}

	// Higher-level convenience functions that handle the full flow
	async function installECDSAValidator(options?: { onSuccess?: () => Promise<void> }) {
		const { wallet } = useEOAWallet()
		if (!wallet.address) {
			openConnectEOAWallet()
			return
		}

		const validationMethod = new ECDSAValidatorVMethod(wallet.address)

		await installValidatorModule(validationMethod, {
			description: 'Install ECDSAValidator',
			...options,
		})
	}

	async function installWebAuthnValidator(options?: { onSuccess?: () => Promise<void> }) {
		const { isLogin, selectedCredential, isFullCredential } = usePasskey()
		if (!isLogin.value) {
			openConnectPasskeyBoth()
			return
		}

		if (isLogin.value && !isFullCredential.value) {
			throw new Error('Passkey without public key cannot be used to install webauthn validator')
		}

		if (!selectedCredential.value) {
			throw new Error('[installWebAuthnValidator] No credential found')
		}

		const credential = selectedCredential.value
		const validationMethod = new WebAuthnValidatorVMethod(
			getAuthenticatorIdHash(credential.credentialId),
			getBigInt(hexlify(credential.pubKeyX)),
			getBigInt(hexlify(credential.pubKeyY)),
			credential.username,
		)

		await installValidatorModule(validationMethod, {
			description: 'Install WebAuthnValidator',
			...options,
		})
	}

	async function installOwnableValidator(options?: { onSuccess?: () => Promise<void> }) {
		const { wallet } = useEOAWallet()
		if (!wallet.address) {
			openConnectEOAWallet()
			return
		}

		const validationMethod = new OwnableValidatorVMethod({
			addresses: [wallet.address],
			threshold: 1,
		})

		await installValidatorModule(validationMethod, {
			description: 'Install OwnableValidator',
			...options,
		})
	}

	async function uninstallECDSAValidator(options?: { onSuccess?: () => Promise<void> }) {
		await uninstallValidatorModule(ADDRESS.ECDSAValidator, 'ECDSAValidator', {
			description: 'Uninstall ECDSAValidator',
			...options,
		})
	}

	async function uninstallWebAuthnValidator(options?: { onSuccess?: () => Promise<void> }) {
		await uninstallValidatorModule(ADDRESS.WebAuthnValidator, 'WebAuthnValidator', {
			description: 'Uninstall WebAuthnValidator',
			...options,
		})
	}

	async function uninstallDeprecatedWebAuthnValidator(options?: { onSuccess?: () => Promise<void> }) {
		await uninstallValidatorModule(DEPRECATED_WEB_AUTHN_VALIDATOR_ADDRESS, 'WebAuthnValidator', {
			description: 'Uninstall Deprecated WebAuthnValidator',
			...options,
		})
	}

	async function uninstallOwnableValidator(options?: { onSuccess?: () => Promise<void> }) {
		await uninstallValidatorModule(ADDRESS.OwnableValidator, 'OwnableValidator', {
			description: 'Uninstall OwnableValidator',
			...options,
		})
	}

	return {
		// Core functions
		installValidatorModule,
		uninstallValidatorModule,

		// Convenience functions for each validator type
		installECDSAValidator,
		installWebAuthnValidator,
		installOwnableValidator,
		uninstallECDSAValidator,
		uninstallWebAuthnValidator,
		uninstallDeprecatedWebAuthnValidator,
		uninstallOwnableValidator,

		isLoading,
	}
}
