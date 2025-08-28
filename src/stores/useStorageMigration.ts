import { OwnableValidatorVMethod } from '@/lib/validations'
import { useAccounts } from './account/useAccounts'

export const useStorageMigrationStore = defineStore(
	'useStorageMigrationStore',
	() => {
		const version = ref('1')

		function runMigrations() {
			if (version.value === '0') {
				console.info('Migrating: update OwnableValidatorVMethod to new format')
				const { accounts } = useAccounts()
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
			if (version.value === '1') {
				console.info('Migrating: Add type to all ValidationMethodData')
				const { accounts } = useAccounts()
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
