import { defineStore, storeToRefs } from 'pinia'
import { useModal } from 'vue-final-modal'
import ConnectSignerModal from '@/components/signer/ConnectSignerModal.vue'

export const useConnectSignerModalStore = defineStore('useConnectSignerModalStore', () => {
	const { open: openConnectEOAWallet } = useModal({
		component: ConnectSignerModal,
		attrs: {
			type: 'eoa-wallet',
			onClose: () => close(),
		},
		slots: {},
	})

	const { open: openConnectPasskeyBoth } = useModal({
		component: ConnectSignerModal,
		attrs: {
			type: 'passkey-both',
			onClose: () => close(),
		},
		slots: {},
	})

	return {
		openConnectEOAWallet,
		openConnectPasskeyBoth,
	}
})

export function useConnectSignerModal() {
	const store = useConnectSignerModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
