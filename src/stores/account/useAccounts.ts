import {
	deserializeValidationMethod,
	getVMethodIdentifier,
	ValidationMethod,
	ValidationMethodName,
} from '@/lib/validations'
import { ImportedAccount, isSameAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useInitCode } from '@/stores/account/useInitCode'
import { CHAIN_ID } from '@/stores/blockchain/chains'
import { JSONParse, JSONStringify } from 'json-with-bigint'
import { isSameAddress } from 'sendop'
import { getAuthenticatorIdHash } from '../passkey/passkeyNoRp'
import { useSigner } from '../useSigner'

// Legacy type for migration purposes
interface LegacyWebAuthnValidationMethodData {
	name: 'WebAuthnValidator'
	credentialId?: string
	authenticatorIdHash?: string
	pubKeyX?: bigint
	pubKeyY?: bigint
	username?: string
}

export const useAccountsStore = defineStore(
	'useAccountsStore',
	() => {
		const { addInitCode, removeInitCode } = useInitCode()
		const { selectedAccount } = useAccount()

		const accounts = ref<ImportedAccount[]>([])

		// migrate vOptions to vMethods
		watchImmediate(accounts, accounts => {
			const vOptionsToVMethods: Record<string, ValidationMethodName> = {
				'EOA-Ownable': 'ECDSAValidator',
				Passkey: 'WebAuthnValidator',
			}
			accounts.forEach(account => {
				if (account.vOptions) {
					for (const vOption of account.vOptions) {
						// add vMethods field if it doesn't exist
						if (!account.vMethods) {
							account.vMethods = []
						}
						const vMethodName = vOptionsToVMethods[vOption.type]
						if (vMethodName === 'WebAuthnValidator') {
							account.vMethods.push({
								name: vMethodName,
								authenticatorIdHash: getAuthenticatorIdHash(vOption.identifier),
							})
						} else {
							account.vMethods.push({
								name: vMethodName,
								address: vOption.identifier,
							})
						}
					}
					delete account.vOptions
					console.log('migrated account', account.address)
				}
			})
		})

		// migrate existing WebAuthnValidatorVMethodData identifier to authenticatorIdHash
		watchImmediate(accounts, accounts => {
			let hasChanges = false
			accounts.forEach(account => {
				if (account.vMethods) {
					account.vMethods.forEach(vMethod => {
						if (vMethod.name === 'WebAuthnValidator') {
							// Check if this is the old format with credentialId
							const vMethodData = vMethod as LegacyWebAuthnValidationMethodData
							if (vMethodData.credentialId && !vMethodData.authenticatorIdHash) {
								// Convert credentialId to authenticatorIdHash
								vMethodData.authenticatorIdHash = getAuthenticatorIdHash(vMethodData.credentialId)
								delete vMethodData.credentialId
								hasChanges = true
								console.log(
									'migrated WebAuthnValidator credentialId to authenticatorIdHash for account',
									account.address,
								)
							}
						}
					})
				}
			})
			if (hasChanges) {
				console.log('WebAuthnValidator migration completed')
			}
		})

		const hasAccounts = computed(() => accounts.value.length > 0)

		function importAccount(account: ImportedAccount, initCode?: string) {
			if (!account.address || !account.chainId || !account.accountId || !account.category) {
				throw new Error(`importAccount: Invalid values: ${JSON.stringify(account)}`)
			}

			// should have at least one vMethod
			if (!account.vMethods || account.vMethods.length === 0) {
				throw new Error(`importAccount: No validation methods`)
			}

			if (accounts.value.some(a => isSameAccount(a, account))) {
				console.log('Account already imported', account)
				return
			}

			accounts.value.push({
				...account,
			})

			if (initCode) {
				if (account.vMethods.length > 1) {
					throw new Error(`importAccount: Multiple vMethods are not supported with init code`)
				}
				addInitCode({
					address: account.address,
					initCode,
					vMethod: account.vMethods[0],
				})
			}

			console.log('Account imported', account)

			if (accounts.value.length === 1) {
				selectedAccount.value = accounts.value[0]
			}
		}

		function removeAccount(account: ImportedAccount) {
			accounts.value = accounts.value.filter(a => !isSameAccount(a, account))

			// remove the init code for the account
			removeInitCode(account.address)

			// if the selected account is the one being removed, select the first account in the list
			if (selectedAccount.value && isSameAccount(selectedAccount.value, account)) {
				if (accounts.value.length > 0) {
					selectedAccount.value = accounts.value[0]
				} else {
					selectedAccount.value = null
				}
			}
		}

		function selectAccount(address: string, chainId: CHAIN_ID) {
			const account = accounts.value.find(a => isSameAddress(a.address, address) && a.chainId === chainId)
			if (!account) {
				throw new Error(`selectAccount: Account not found: ${address} ${chainId}`)
			}
			selectedAccount.value = account
		}

		function unselectAccount() {
			selectedAccount.value = null
		}

		function isAccountImported(accountAddress: string, chainId: CHAIN_ID) {
			return accounts.value.some(a => isSameAddress(a.address, accountAddress) && a.chainId === chainId)
		}

		function addValidationMethod(account: ImportedAccount, vMethod: ValidationMethod) {
			const acc = accounts.value.find(a => isSameAccount(a, account))
			if (!acc) {
				throw new Error(`[addValidationMethod] Account not found: ${account.address} ${account.chainId}`)
			}

			// don't add the same vMethod if the vMethod name and identifier are the same
			if (acc.vMethods.some(v => v.name === vMethod.name && getVMethodIdentifier(v) === vMethod.identifier)) {
				throw new Error(
					`[addValidationMethod] Validation method already exists: ${vMethod.name} ${vMethod.identifier}`,
				)
			}

			acc.vMethods.push(vMethod.serialize())
			accounts.value = accounts.value.map(a => (isSameAccount(a, acc) ? acc : a))

			// if selected account is the one being updated, update the selected account
			if (selectedAccount.value && isSameAccount(selectedAccount.value, acc)) {
				selectedAccount.value = acc
			}
		}

		function removeValidationMethod(account: ImportedAccount, name: ValidationMethodName) {
			const acc = accounts.value.find(a => isSameAccount(a, account))
			if (!acc) {
				throw new Error(`removeValidationMethod: Account not found: ${account.address} ${account.chainId}`)
			}
			acc.vMethods = acc.vMethods.filter(v => v.name !== name)
			accounts.value = accounts.value.map(a => (isSameAccount(a, acc) ? acc : a))

			// if selected account is the one being updated, update the selected account
			if (selectedAccount.value && isSameAccount(selectedAccount.value, acc)) {
				selectedAccount.value = acc
			}

			// select the signer that's left if the signer is connected
			const signerType = deserializeValidationMethod(acc.vMethods[0]).signerType
			const { isSignerConnected, selectSigner } = useSigner()
			if (isSignerConnected(signerType)) {
				selectSigner(signerType)
			}
		}

		return {
			accounts,
			hasAccounts,
			importAccount,
			removeAccount,
			selectAccount,
			unselectAccount,
			isAccountImported,
			addValidationMethod,
			removeValidationMethod,
		}
	},
	{
		persist: {
			pick: ['accounts'],
			// Note: If the stored data contains bigint, a serializer must be used.
			// Otherwise, the state will be ignored and not saved to local storage.
			serializer: {
				deserialize: JSONParse,
				serialize: JSONStringify,
			},
		},
	},
)

export function useAccounts() {
	const store = useAccountsStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
