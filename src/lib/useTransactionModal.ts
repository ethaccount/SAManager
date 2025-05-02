import TransactionModal from '@/components/TransactionModal.vue'
import { Execution } from 'sendop'
import { useModal } from 'vue-final-modal'

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

	return {
		openModal,
		closeModal: close,
	}
}
