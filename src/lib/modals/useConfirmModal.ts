import { useModal } from 'vue-final-modal'
import ConfirmModal from '@/components/ConfirmModal.vue'

export function useConfirmModal() {
	const { open, close, patchOptions } = useModal({
		component: ConfirmModal,
	})

	function openModal(props: InstanceType<typeof ConfirmModal>['$props']) {
		patchOptions({
			attrs: {
				...props,
				onConfirm: (dontShowAgain: boolean) => {
					props.onConfirm?.(dontShowAgain)
					close()
				},
				onCancel: () => {
					props.onCancel?.()
					close()
				},
				onClose: () => {
					props.onClose?.()
					close()
				},
			},
		})

		open()
	}

	return {
		openModal,
		closeModal: close,
	}
}
