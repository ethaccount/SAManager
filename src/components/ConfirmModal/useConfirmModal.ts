import ConfirmModal from './ConfirmModal.vue'
import { useModal } from 'vue-final-modal'

export interface ConfirmModalProps {
	title?: string
	message: string
	confirmText?: string
	cancelText?: string
	showCloseButton?: boolean
	clickToClose?: boolean
	escToClose?: boolean
	showDontShowAgain?: boolean
	dontShowAgainText?: string
	onResult?: (result: boolean, dontShowAgain?: boolean) => void
}

const defaultProps: ConfirmModalProps = {
	message: '',
}

export function useConfirmModal() {
	const { open, close, patchOptions } = useModal({
		component: ConfirmModal,
		attrs: {
			...defaultProps,
			onConfirm: (dontShowAgain?: boolean) => {
				if (currentProps?.onResult) {
					currentProps.onResult(true, dontShowAgain)
				}
				close()
			},
			onCancel: (dontShowAgain?: boolean) => {
				if (currentProps?.onResult) {
					currentProps.onResult(false, dontShowAgain)
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
