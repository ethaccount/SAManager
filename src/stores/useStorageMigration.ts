import { OwnableValidatorVMethod, ValidationMethodName } from '@/lib/validations'
import { useAccounts } from './account/useAccounts'
import { getAuthenticatorIdHash } from './passkey/passkeyNoRp'

export const useStorageMigrationStore = defineStore(
	'useStorageMigrationStore',
	() => {
		const version = ref('0')

		const { accounts } = useAccounts()

		function runMigrations() {
			// migrate OwnableValidatorVMethod to new format
			if (version.value === '0') {
				console.info('Migrating: Update OwnableValidatorVMethod to new format')

				for (const account of accounts.value) {
					for (let i = 0; i < account.vMethods.length; i++) {
						const vMethod = account.vMethods[i]
						if (vMethod.name === 'OwnableValidator') {
							account.vMethods[i] = new OwnableValidatorVMethod({
								addresses: [(vMethod as unknown as { address: string }).address],
								threshold: 1,
							}).serialize()
						}
					}
				}
				console.info('Migration 0 completed; Bump version to 1')
				version.value = '1'
			}

			// migrate vMethods to have type field
			if (version.value === '1') {
				console.info('Migrating: Add type to all ValidationMethodData')
				for (const account of accounts.value) {
					for (let i = 0; i < account.vMethods.length; i++) {
						const vMethod = account.vMethods[i]
						if (vMethod.type === undefined) {
							// @ts-expect-error skip
							if (vMethod.name === 'ECDSAValidator' || vMethod.name === 'Simple7702Account') {
								// @ts-expect-error skip
								vMethod.type = 'EOA-Owned'
								// @ts-expect-error skip
							} else if (vMethod.name === 'WebAuthnValidator') {
								// @ts-expect-error skip
								vMethod.type = 'PASSKEY'
							}
						}
					}
				}
				console.info('Migration 1 completed; Bump version to 2')
				version.value = '2'
			}

			// migrate vOptions to vMethods
			if (version.value === '2') {
				console.info('Migrating: Add vMethods field to all accounts')
				const vOptionsToVMethods: Record<string, ValidationMethodName> = {
					'EOA-Ownable': 'ECDSAValidator',
					Passkey: 'WebAuthnValidator',
				}
				accounts.value.forEach(account => {
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
									type: 'PASSKEY',
								})
								// @ts-expect-error skip
							} else if (vMethodName === 'EOA-Ownable') {
								account.vMethods.push({
									name: vMethodName,
									address: vOption.identifier,
									type: 'EOA-Owned',
								})
							}
						}
						delete account.vOptions
					}
				})
				console.info('Migration 2 completed; Bump version to 3')
				version.value = '3'
			}

			interface LegacyWebAuthnValidationMethodData {
				name: 'WebAuthnValidator'
				credentialId?: string
				authenticatorIdHash?: string
				pubKeyX?: bigint
				pubKeyY?: bigint
				username?: string
			}

			// migrate WebAuthnValidatorVMethodData identifier to authenticatorIdHash
			if (version.value === '3') {
				console.info('Migrating: Convert credentialId to authenticatorIdHash')
				accounts.value.forEach(account => {
					if (account.vMethods) {
						account.vMethods.forEach(vMethod => {
							if (vMethod.name === 'WebAuthnValidator') {
								// Check if this is the old format with credentialId
								const vMethodData = vMethod as LegacyWebAuthnValidationMethodData
								if (vMethodData.credentialId && !vMethodData.authenticatorIdHash) {
									// Convert credentialId to authenticatorIdHash
									vMethodData.authenticatorIdHash = getAuthenticatorIdHash(vMethodData.credentialId)
									delete vMethodData.credentialId
								}
							}
						})
					}
				})
				console.info('Migration 3 completed; Bump version to 4')
				version.value = '4'
			}
		}

		return {
			version,
			runMigrations,
		}
	},
	{
		persist: true,
	},
)

export function useStorageMigration() {
	const store = useStorageMigrationStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
