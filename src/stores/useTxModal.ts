import TxModal from '@/components/TxModal.vue'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { defineStore, storeToRefs } from 'pinia'
import {
	ADDRESS,
	createUserOp,
	DeprecatedPublicPaymaster,
	estimateUserOp,
	Execution,
	getPaymasterData,
	sendUserOp,
	signUserOp,
	UserOp,
	UserOpReceipt,
} from 'sendop'
import { useModal } from 'vue-final-modal'

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

export type TxModalExecution = Execution & {
	description?: string
}

export const useTxModalStore = defineStore('useTxModalStore', () => {
	const defaultProps: InstanceType<typeof TxModal>['$props'] = {
		executions: [],
		onClose: () => close(),
	}

	const { open, close, patchOptions } = useModal({
		component: TxModal,
		attrs: {
			...defaultProps,
		},
		slots: {},
	})

	function openModal(props?: InstanceType<typeof TxModal>['$props']) {
		patchOptions({
			attrs: {
				...defaultProps, // must set default props to clear the props
				...props,
			},
		})
		open()
	}

	const { bundler } = useBlockchain()
	const { selectedAccount, opGetter } = useAccount()

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
	const opHash = ref<string | null>(null)
	const opReceipt = ref<UserOpReceipt | null>(null)

	const pmGetter = computed(() => {
		switch (selectedPaymaster.value) {
			case 'public':
				return new DeprecatedPublicPaymaster(ADDRESS.PublicPaymaster)
			default:
				return undefined
		}
	})

	async function handleEstimate(executions: Execution[], initCode?: string) {
		if (!opGetter.value || !selectedAccount.value) {
			throw new Error('handleEstimate: Account not selected')
		}

		if (executions.length === 0 && !initCode) {
			throw new Error('handleEstimate: No executions and no init code provided')
		}

		let _userOp: UserOp | null = null

		try {
			_userOp = await createUserOp(bundler.value, executions, opGetter.value, initCode)
		} catch (e: unknown) {
			throw new Error('handleEstimate: Failed to create user operation', { cause: e })
		}

		const estimation = await estimateUserOp(_userOp, bundler.value, opGetter.value, pmGetter.value)

		_userOp = estimation.userOp
		if (!estimation.pmIsFinal && pmGetter.value) {
			_userOp = await getPaymasterData(_userOp, pmGetter.value)
		}

		userOp.value = _userOp
	}

	async function handleSign() {
		if (!userOp.value || !opGetter.value || !selectedAccount.value) {
			throw new Error('handleSign: Transaction not prepared')
		}
		userOp.value = await signUserOp(userOp.value, bundler.value, opGetter.value)
	}

	async function handleSend() {
		if (!userOp.value) {
			throw new Error('handleSend: Transaction not signed')
		}

		// Send the user operation
		const op = await sendUserOp(bundler.value, userOp.value)

		opHash.value = op.hash

		// Wait for the transaction to be mined
		status.value = TransactionStatus.Pending
		const receipt = await op.wait()

		opReceipt.value = receipt

		if (receipt.success) {
			status.value = TransactionStatus.Success
		} else {
			status.value = TransactionStatus.Failed
		}
	}

	function reset() {
		status.value = TransactionStatus.Estimation
		userOp.value = null
		opHash.value = null
		opReceipt.value = null
		selectedPaymaster.value = 'public'
	}

	return {
		openModal,
		closeModal: close,
		reset,
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
		opHash,
		opReceipt,
	}
})

export function useTxModal() {
	const store = useTxModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
