import { getInstallModuleData, getUninstallModuleData } from '@/lib/accounts/account-specific'
import { useConnectSignerModal } from '@/lib/useConnectSignerModal'
import { ECDSAValidatorVMethod, SingleOwnableValidatorVMethod, WebAuthnValidatorVMethod } from '@/lib/validations'
import { getModuleByValidationMethod } from '@/lib/validations/helpers'
import { useAccount } from '@/stores/account/useAccount'
import { useAccounts } from '@/stores/account/useAccounts'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { usePasskey } from '@/stores/passkey/usePasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { TxModalExecution, useTxModal } from '@/stores/useTxModal'
import { getBigInt, hexlify } from 'ethers'
import { ADDRESS, ERC7579_MODULE_TYPE, ERC7579Module } from 'sendop'
import { toast } from 'vue-sonner'

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
		validationMethod: ECDSAValidatorVMethod | WebAuthnValidatorVMethod | SingleOwnableValidatorVMethod,
		options?: {
			description?: string
			onSuccess?: () => Promise<void>
		},
	) {
		const { description = 'Install Module', onSuccess } = options || {}

		if (!validateAccountAccess()) return

		isLoading.value = true

		try {
			const module = getModuleByValidationMethod(validationMethod)

			const execution: TxModalExecution = {
				description,
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
					await onSuccess?.()
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
		const { description = 'Uninstall Module', onSuccess } = options || {}

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
				description,
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
					await onSuccess?.()
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
		const { isLogin, selectedCredential } = usePasskey()
		if (!isLogin.value) {
			toast.info('Login with Passkey to install validator')
			openConnectPasskeyBoth()
			return
		}

		if (!selectedCredential.value) {
			throw new Error('No credential found')
		}

		const credential = selectedCredential.value
		const validationMethod = new WebAuthnValidatorVMethod(
			credential.credentialId,
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

		const validationMethod = new SingleOwnableValidatorVMethod(wallet.address)

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
		uninstallOwnableValidator,

		isLoading,
	}
}
