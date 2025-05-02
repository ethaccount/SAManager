import TransactionModal from '@/components/TransactionModal/TransactionModal.vue'
import { useAccounts } from '@/stores/useAccounts'
import { useNetwork } from '@/stores/useNetwork'
import {
	ADDRESS,
	createUserOp,
	estimateUserOp,
	Execution,
	getPaymasterData,
	PublicPaymaster,
	sendUserOp,
	signUserOp,
	UserOp,
} from 'sendop'
import { useModal } from 'vue-final-modal'

export enum TransactionStatus {
	Reviewing = 'Reviewing',
	Estimating = 'Estimating',
	Signing = 'Signing',
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
	const { selectedAccount, opGetter } = useAccounts()

	const availableValidationMethods = computed(() => {
		if (!selectedAccount.value?.vOptions) return []
		return selectedAccount.value.vOptions.map(opt => ({
			type: opt.type,
			publicKey: opt.publicKey,
		}))
	})

	const selectedValidationMethod = ref(availableValidationMethods.value[0]?.type || null)

	const paymasters = [
		{ id: 'none', name: 'No Paymaster', description: 'Pay gas fees with native tokens' },
		{ id: 'public', name: 'Public Paymaster', description: 'Use public paymaster for gas sponsorship' },
	] as const

	const selectedPaymaster = ref<(typeof paymasters)[number]['id']>('none')

	const status = ref<TransactionStatus>(TransactionStatus.Reviewing)

	const canEstimate = computed(() => {
		if (status.value !== TransactionStatus.Reviewing && status.value !== TransactionStatus.Failed) return false
		if (!selectedValidationMethod.value) return false
		if (!selectedPaymaster.value) return false
		return true
	})

	const canSign = computed(() => {
		if (status.value !== TransactionStatus.Reviewing && status.value !== TransactionStatus.Failed) return false
		return userOp.value !== null
	})

	const canSend = computed(() => {
		if (status.value !== TransactionStatus.Reviewing && status.value !== TransactionStatus.Failed) return false
		return userOp.value !== null && userOp.value.signature !== undefined
	})

	const userOp = ref<UserOp | null>(null)

	const pmGetter = computed(() => {
		switch (selectedPaymaster.value) {
			case 'public':
				return new PublicPaymaster(ADDRESS.PublicPaymaster)
			default:
				return undefined
		}
	})

	async function handleEstimate(executions: Execution[]) {
		if (!opGetter.value || !selectedAccount.value) {
			throw new Error('Account not selected')
		}

		let _userOp: UserOp | null = null

		try {
			_userOp = await createUserOp(
				bundler.value,
				executions,
				opGetter.value,
				selectedAccount.value.initCode || undefined,
			)
		} catch (e: unknown) {
			throw new Error('Failed to create user operation', { cause: e })
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
			throw new Error('Transaction not prepared')
		}
		userOp.value = await signUserOp(userOp.value, bundler.value, opGetter.value)
	}

	async function handleSend() {
		if (!userOp.value) {
			throw new Error('Transaction not signed')
		}
		const op = await sendUserOp(bundler.value, userOp.value)
		const receipt = await op.wait()

		if (receipt.success) {
			status.value = TransactionStatus.Success
		} else {
			status.value = TransactionStatus.Failed
			throw new Error('Transaction failed on chain')
		}
	}

	return {
		openModal,
		closeModal: close,
		handleEstimate,
		handleSign,
		handleSend,
		userOp,
		selectedValidationMethod,
		availableValidationMethods,
		selectedPaymaster,
		paymasters,
		canEstimate,
		canSign,
		canSend,
		status,
	}
}
