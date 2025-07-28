import AccountDrawer from '@/components/AccountDrawer/AccountDrawer.vue'
import { useModal } from 'vue-final-modal'

export function useAccountDrawer() {
	const { open, close, options } = useModal({
		component: AccountDrawer,
		attrs: {
			onClose: () => close(),
		},
		slots: {},
	})

	function toggle() {
		if (options.modelValue) {
			close()
		} else {
			open()
		}
	}

	return {
		toggle,
	}
}
