import { usePaymaster } from '@/components/ExecutionModal/paymasters'
import { PaymasterServiceCapability } from '@/features/account-capabilities'
import { UserOpDirector } from '@/lib/UserOpDirector'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useSigner } from '@/stores/useSigner'
import { Execution, PaymasterService, UserOpBuilder, UserOperationReceipt } from 'sendop'
import { useModal } from 'vue-final-modal'
import { toast } from 'vue-sonner'
import ExecutionModal from './ExecutionModal.vue'

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

export type ExecutionUIProps = {
	executions?: ExecutionModalExecution[]
	useModalSpecificStyle?: boolean
	paymasterCapability?: PaymasterServiceCapability
}

export type ExecutionUIEmits = {
	(e: 'close'): void
	(e: 'sent', hash: string): void
	(e: 'executed'): void // when status is success or failed
	(e: 'success'): void
	(e: 'failed'): void
}

export type ExecutionModalExecution = Execution & {
	description?: string
}

export const useExecutionModalStore = defineStore('useExecutionModalStore', () => {
	const { open, close, patchOptions } = useModal({
		component: ExecutionModal,
	})

	const defaultProps: InstanceType<typeof ExecutionModal>['$props'] = {
		executions: [],
	}

	function openModal(props: InstanceType<typeof ExecutionModal>['$props']) {
		const { isAccountAccessible } = useAccount()
		if (!isAccountAccessible.value) {
			toast.error('Please connect your account first')
			return
		}

		patchOptions({
			attrs: {
				...defaultProps, // set default props to clear the props
				...props, // override default props
				onClose: () => {
					props?.onClose?.()
					close()
				},
				onExecuted: () => {
					props?.onExecuted?.()
				},
				onSuccess: () => {
					props?.onSuccess?.()
				},
				onFailed: () => {
					props?.onFailed?.()
				},
			},
		})

		open()

		status.value = TransactionStatus.Initial
	}

	const { bundler, selectedChainId, client, fetchGasPrice, currentEntryPointAddress } = useBlockchain()
	const { selectedAccount, accountVMethods } = useAccount()
	const { selectedSignerType } = useSigner()

	const { selectedPaymaster, resetUsdcData, buildPaymasterData } = usePaymaster()

	const status = ref<TransactionStatus>(TransactionStatus.Closed)

	// Determine if modal can be closed
	const canClose = computed(() => {
		return status.value !== TransactionStatus.Sending && status.value !== TransactionStatus.Pending
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

	function resetExecutionModal() {
		status.value = TransactionStatus.Closed
		userOp.value = null
		opHash.value = null
		opReceipt.value = null
		resetUsdcData()
	}

	async function handleEstimate({
		executions,
		initCode,
		paymasterCapability,
	}: {
		executions: Execution[]
		initCode?: string
		paymasterCapability?: PaymasterServiceCapability
	}) {
		// throw new Error(
		// 	'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.',
		// )

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
		let isFinal = false

		if (selectedPaymaster.value === 'erc7677') {
			if (!paymasterCapability) {
				throw new Error('[handleEstimate] Paymaster capability not provided')
			}
			const paymasterService = new PaymasterService(paymasterCapability.url, selectedChainId.value)
			const paymasterStubData = await paymasterService.getPaymasterStubData({
				userOp: op.preview(),
				entryPointAddress: currentEntryPointAddress.value,
				context: paymasterCapability.context || {},
			})
			if (!paymasterStubData) {
				throw new Error('[handleEstimate] Paymaster stub data not found')
			}
			op.setPaymaster(paymasterStubData)
			isFinal = paymasterStubData.isFinal || false
		} else {
			// public paymaster or usdc paymaster
			const paymasterData = await buildPaymasterData()
			if (paymasterData) {
				op.setPaymaster(paymasterData)
			}
		}

		op.setGasPrice(await fetchGasPrice())

		try {
			await op.estimateGas()

			if (selectedPaymaster.value === 'erc7677' && !isFinal) {
				if (!paymasterCapability) {
					throw new Error('[handleEstimate] Paymaster capability not provided')
				}
				const paymasterService = new PaymasterService(paymasterCapability.url, selectedChainId.value)
				const paymasterData = await paymasterService.getPaymasterData({
					userOp: op.preview(),
					entryPointAddress: currentEntryPointAddress.value,
					context: paymasterCapability.context || {},
				})
				if (!paymasterData) {
					throw new Error('[handleEstimate] Paymaster data not found')
				}
				op.setPaymasterData(paymasterData.paymasterData)
			}
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

	async function sendUserOp() {
		if (!userOp.value) {
			throw new Error('[sendUserOp] User operation not built')
		}
		const op = userOp.value

		status.value = TransactionStatus.Sending
		await op.send()
		status.value = TransactionStatus.Pending
	}

	async function waitUserOp() {
		if (!userOp.value) {
			throw new Error('[waitUserOp] User operation not built')
		}
		const op = userOp.value
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
		canClose,
		openModal,
		closeModal: close,
		resetExecutionModal,
		handleEstimate,
		handleSign,
		sendUserOp,
		waitUserOp,
	}
})

export function useExecutionModal() {
	const store = useExecutionModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
