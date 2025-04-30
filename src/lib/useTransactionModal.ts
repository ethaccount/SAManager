import TransactionModal from '@/components/TransactionModal.vue'
import { useModal } from 'vue-final-modal'

export function useTransactionModal() {
	const { open, close } = useModal({
		component: TransactionModal,
		attrs: {
			onClose: () => close(),
		},
		slots: {},
	})

	return {
		openModal: open,
		closeModal: close,
	}
}
