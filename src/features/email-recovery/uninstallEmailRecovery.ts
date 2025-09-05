import { getUninstallModuleData } from '@/lib/accounts/account-specific'
import { EMAIL_RECOVERY_EXECUTOR_ADDRESS } from '@/features/email-recovery'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useExecutionModal, type ExecutionModalExecution } from '@/components/execution'
import { ERC7579_MODULE_TYPE, type ERC7579Module } from 'sendop'
import { ref } from 'vue'

export function useUninstallEmailRecovery() {
	const { selectedAccount, isAccountAccessible } = useAccount()
	const { client } = useBlockchain()
	const isLoading = ref(false)

	function validateAccountAccess() {
		if (!selectedAccount.value) {
			throw new Error('No account selected')
		}
		if (!isAccountAccessible.value) {
			throw new Error('Account is not accessible')
		}
		return true
	}

	async function uninstallEmailRecovery(options?: { onSuccess?: () => Promise<void> }) {
		if (!selectedAccount.value) {
			throw new Error('No account selected')
		}

		if (!validateAccountAccess()) return

		isLoading.value = true

		try {
			// Create the email recovery executor module for uninstall
			const emailRecoveryModule: ERC7579Module = {
				address: EMAIL_RECOVERY_EXECUTOR_ADDRESS,
				type: ERC7579_MODULE_TYPE.EXECUTOR,
				initData: '0x',
				deInitData: '0x',
			}

			const execution: ExecutionModalExecution = {
				description: 'Uninstall Email Recovery Module',
				to: selectedAccount.value.address,
				data: await getUninstallModuleData(
					selectedAccount.value.accountId,
					emailRecoveryModule,
					selectedAccount.value.address,
					client.value,
				),
				value: 0n,
			}

			useExecutionModal().openModal({
				executions: [execution],
				onSuccess: async () => {
					await options?.onSuccess?.()
				},
			})
		} catch (e: unknown) {
			throw e
		} finally {
			isLoading.value = false
		}
	}

	return {
		uninstallEmailRecovery,
		isLoading,
	}
}

// Export the function directly for convenience
export async function uninstallEmailRecovery(options?: { onSuccess?: () => Promise<void> }) {
	const { uninstallEmailRecovery: uninstall } = useUninstallEmailRecovery()
	return await uninstall(options)
}
