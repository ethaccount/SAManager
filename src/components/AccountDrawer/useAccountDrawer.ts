import AccountDrawer from '@/components/AccountDrawer/AccountDrawer.vue'
import { useModal } from 'vue-final-modal'

export function useAccountDrawer() {
	const { open, close } = useModal({
		component: AccountDrawer,
		attrs: {
			onClose: () => close(),
		},
		slots: {},
	})

	return {
		openAccountDrawer: open,
		closeAccountDrawer: close,
	}
}
