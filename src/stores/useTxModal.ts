import TxModal from '@/components/TxModal.vue'
import { usePaymaster } from '@/lib/paymasters'
import { UserOpDirector } from '@/lib/UserOpDirector'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { defineStore, storeToRefs } from 'pinia'
import { Execution, UserOpBuilder, UserOperationReceipt } from 'sendop'
import { useModal } from 'vue-final-modal'
import { toast } from 'vue-sonner'
import { SUPPORTED_BUNDLER } from './blockchain/blockchain'
import { useSigner } from './useSigner'

export enum TransactionStatus {
	Closed = 'Closed',
	Initial = 'Initial',
	PreparingPaymaster = 'PreparingPaymaster',
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
	// Keep in sync with TxModal props and emits
	const defaultProps: InstanceType<typeof TxModal>['$props'] = {
		executions: [],
		onClose: () => close(),
		onExecuted: () => {},
		onSuccess: () => {},
		onFailed: () => {},
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
		status.value = TransactionStatus.Initial
	}

	const { bundler, selectedChainId, client, fetchGasPrice, selectedBundler } = useBlockchain()
	const { selectedAccount, accountVMethods } = useAccount()
	const { selectedSignerType } = useSigner()

	const paymasterHook = usePaymaster()
	const {
		selectedPaymaster,
		hasValidUsdcBalance,
		isValidPermitAmount,
		isSigningPermit,
		resetUsdcData,
		buildPaymasterData,
	} = paymasterHook

	const status = ref<TransactionStatus>(TransactionStatus.Closed)

	// Auto switch to 'none' if 'public' paymaster is selected and bundler is etherspot in initial status
	watch(status, () => {
		if (status.value === TransactionStatus.Initial) {
			if (selectedPaymaster.value === 'public' && selectedBundler.value === SUPPORTED_BUNDLER.ETHERSPOT) {
				selectedPaymaster.value = 'none'
				toast.info('Public Paymaster cannot be used with Etherspot Bundler')
			}
		}
	})

	const canSignPermit = computed(() => {
		return (
			selectedPaymaster.value === 'usdc' &&
			hasValidUsdcBalance.value &&
			isValidPermitAmount.value &&
			!isSigningPermit.value &&
			(status.value === TransactionStatus.Initial || status.value === TransactionStatus.PreparingPaymaster)
		)
	})

	const canEstimate = computed(() => {
		if (status.value !== TransactionStatus.Initial) return false
		if (!selectedPaymaster.value) return false
		return true
	})

	const canSign = computed(() => {
		if (status.value !== TransactionStatus.Sign) return false
		return true
	})

	const canSend = computed(() => {
		if (status.value !== TransactionStatus.Send) return false
		return true
	})

	const userOp = ref<UserOpBuilder | null>(null)
	const opHash = ref<string | null>(null)
	const opReceipt = ref<UserOperationReceipt | null>(null)

	function resetTxModal() {
		status.value = TransactionStatus.Closed
		userOp.value = null
		opHash.value = null
		opReceipt.value = null
		resetUsdcData()
	}

	async function handleEstimate(executions: Execution[], initCode?: string) {
		if (!selectedAccount.value) {
			throw new Error('[handleEstimate] Account not selected')
		}

		if (!selectedSignerType.value) {
			throw new Error('[handleEstimate] No signer selected')
		}

		if (executions.length === 0 && !initCode) {
			throw new Error('[handleEstimate] No executions and no init code provided')
		}

		const op = new UserOpBuilder({
			chainId: selectedChainId.value,
			bundler: bundler.value,
		})

		await UserOpDirector.buildAccountExecutions({
			op,
			accountId: selectedAccount.value.accountId,
			vMethods: accountVMethods.value,
			signerType: selectedSignerType.value,
			accountAddress: selectedAccount.value.address,
			client: client.value,
			executions,
		})

		if (initCode) {
			op.setFactory({
				factory: initCode.slice(0, 42),
				factoryData: '0x' + initCode.slice(42),
			})
		}

		// Set paymaster data based on selected paymaster
		const paymasterData = await buildPaymasterData()
		if (paymasterData) {
			op.setPaymaster(paymasterData)
		}

		op.setGasPrice(await fetchGasPrice())

		try {
			await op.estimateGas()
		} catch (e: unknown) {
			console.error(op.preview())
			throw e
		}

		// Notice: markRaw is used to prevent TypeError: Cannot read from private field
		// similar issue: https://github.com/vuejs/core/issues/8245
		userOp.value = markRaw(op)
	}

	async function handleSign() {
		if (!userOp.value) {
			throw new Error('[handleSign] User operation not built')
		}

		const { selectedSigner } = useSigner()

		if (!selectedSigner.value) {
			throw new Error('[handleSign] No signer selected')
		}

		const signature = await selectedSigner.value.sign(userOp.value as UserOpBuilder)
		userOp.value.setSignature(signature)
		// Notice to formate signature if needed
	}

	async function handleSend() {
		if (!userOp.value) {
			throw new Error('[handleSend] User operation not built')
		}
		const op = userOp.value

		await op.send()

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

	return {
		userOp,
		canEstimate,
		canSign,
		canSend,
		status,
		opHash,
		opReceipt,
		canSignPermit,
		openModal,
		closeModal: close,
		resetTxModal,
		handleEstimate,
		handleSign,
		handleSend,
		...paymasterHook,
	}
})

export function useTxModal() {
	const store = useTxModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
