import TransactionModal from '@/components/TransactionModal/TransactionModal.vue'
import { useAccount } from '@/stores/account/useAccount'
import { useNetwork } from '@/stores/network/useNetwork'
import {
	ADDRESS,
	createUserOp,
	estimateUserOp,
	Execution,
	getPaymasterData,
	isSameAddress,
	JsonRpcError,
	PublicPaymaster,
	sendUserOp,
	signUserOp,
	UserOp,
} from 'sendop'
import { useModal } from 'vue-final-modal'
import { toast } from 'vue-sonner'

export enum TransactionStatus {
	Estimation = 'Estimation',
	Estimating = 'Estimating',
	Sign = 'Sign',
	Signing = 'Signing',
	Send = 'Send',
	Sending = 'Sending',
	Pending = 'Pending',
	Success = 'Success',
	Failed = 'Failed',
}

export function useTransactionModal() {
	const { open, close, patchOptions } = useModal({
		component: TransactionModal,
		attrs: {
			onClose: () => close(),
		},
		slots: {},
	})

	function openModal(execs: Execution[]) {
		patchOptions({
			attrs: {
				executions: execs,
			},
		})
		open()
	}

	const { bundler } = useNetwork()
	const { selectedAccount, opGetter, selectedAccountInitCode } = useAccount()

	const paymasters = [
		{ id: 'none', name: 'No Paymaster', description: 'Pay gas fees with native tokens' },
		{ id: 'public', name: 'Public Paymaster', description: 'Use public paymaster for gas sponsorship' },
	] as const

	const selectedPaymaster = ref<(typeof paymasters)[number]['id']>('public')

	const status = ref<TransactionStatus>(TransactionStatus.Estimation)

	const canEstimate = computed(() => {
		if (status.value !== TransactionStatus.Estimation) return false
		if (!selectedPaymaster.value) return false
		return true
	})

	const canSign = computed(() => {
		if (status.value !== TransactionStatus.Sign) return false
		return userOp.value !== null
	})

	const canSend = computed(() => {
		if (status.value !== TransactionStatus.Send) return false
		return userOp.value !== null && userOp.value.signature !== undefined
	})

	const userOp = ref<UserOp | null>(null)
	const txHash = ref<string | null>(null)

	const pmGetter = computed(() => {
		switch (selectedPaymaster.value) {
			case 'public':
				return new PublicPaymaster(ADDRESS.PublicPaymaster)
			default:
				return undefined
		}
	})

	async function handleEstimate(executions: Execution[], initCode?: string) {
		if (!opGetter.value || !selectedAccount.value) {
			throw new Error('Account not selected')
		}

		if (executions.length === 0 && !initCode) {
			throw new Error('No executions and no init code provided')
		}

		let _userOp: UserOp | null = null

		try {
			_userOp = await createUserOp(bundler.value, executions, opGetter.value, initCode)
		} catch (e: unknown) {
			throw new Error('Failed to create user operation', { cause: e })
		}

		try {
			console.log('estimation userOp', _userOp)
			const estimation = await estimateUserOp(_userOp, bundler.value, opGetter.value, pmGetter.value)
			_userOp = estimation.userOp
			if (!estimation.pmIsFinal && pmGetter.value) {
				_userOp = await getPaymasterData(_userOp, pmGetter.value)
			}
		} catch (e: unknown) {
			if (e instanceof Error) {
				if (e.cause instanceof JsonRpcError) {
					throw new Error(e.cause.message)
				}
			}
			throw new Error('Failed to estimate gas fees', { cause: e })
		}

		userOp.value = _userOp
	}

	async function handleSign() {
		if (!userOp.value || !opGetter.value || !selectedAccount.value) {
			throw new Error('Transaction not prepared')
		}
		userOp.value = await signUserOp(userOp.value, bundler.value, opGetter.value)
	}

	async function handleSend() {
		if (!userOp.value) {
			throw new Error('Transaction not signed')
		}
		try {
			// Send the user operation
			const op = await sendUserOp(bundler.value, userOp.value)

			// Wait for the transaction to be mined
			status.value = TransactionStatus.Pending
			const receipt = await op.wait()

			// Store the transaction hash
			const sender = userOp.value.sender
			const foundLog = receipt.logs.find(log => isSameAddress(log.address, sender))
			if (!foundLog) {
				txHash.value = receipt.receipt.transactionHash

				const warning = `Cannot find the sender's tx hash in logs, using the tx hash for the entire bundle`
				toast.warning(warning)
				console.log(warning, receipt)
			} else {
				txHash.value = foundLog.transactionHash
			}

			if (receipt.success) {
				status.value = TransactionStatus.Success
			} else {
				status.value = TransactionStatus.Failed
			}
		} catch (e: unknown) {
			if (e instanceof Error) {
				if (e.cause instanceof JsonRpcError) {
					throw new Error(e.cause.message)
				}
			}
			throw new Error('Failed to send transaction', { cause: e })
		}
	}

	return {
		openModal,
		closeModal: close,
		handleEstimate,
		handleSign,
		handleSend,
		userOp,
		selectedPaymaster,
		paymasters,
		canEstimate,
		canSign,
		canSend,
		status,
		txHash,
	}
}
