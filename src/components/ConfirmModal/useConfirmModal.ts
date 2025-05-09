import ConfirmModal from './ConfirmModal.vue'
import { useModal } from 'vue-final-modal'

interface ConfirmModalProps {
	title?: string
	message: string
	confirmText?: string
	cancelText?: string
	onResult?: (result: boolean) => void
}

const defaultProps: ConfirmModalProps = {
	message: '',
}

export function useConfirmModal() {
	const { open, close, patchOptions } = useModal({
		component: ConfirmModal,
		attrs: {
			...defaultProps,
			onConfirm: () => {
				if (currentProps?.onResult) {
					currentProps.onResult(true)
				}
				close()
			},
			onCancel: () => {
				if (currentProps?.onResult) {
					currentProps.onResult(false)
				}
				close()
			},
		},
		slots: {},
	})

	let currentProps: ConfirmModalProps | null = null

	function openModal(props: ConfirmModalProps) {
		currentProps = props
		patchOptions({
			attrs: {
				...props,
			},
		})
		open()
	}

	return {
		openModal,
		closeModal: close,
	}
}
