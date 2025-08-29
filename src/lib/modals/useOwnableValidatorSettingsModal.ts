import OwnableValidatorSettingsModal from '@/views/AccountManagement/OwnableValidatorSettingsModal.vue'
import { useModal } from 'vue-final-modal'

export function useOwnableValidatorSettingsModal() {
	const { open, close, patchOptions } = useModal({
		component: OwnableValidatorSettingsModal,
	})

	function openModal(props: InstanceType<typeof OwnableValidatorSettingsModal>['$props']) {
		patchOptions({
			attrs: {
				...props,
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
