import { defineStore, storeToRefs } from 'pinia'
import { useModal } from 'vue-final-modal'
import ConnectSignerModal from '@/components/signer/ConnectSignerModal.vue'

export const useConnectSignerModalStore = defineStore('useConnectSignerModalStore', () => {
	const { open: openConnectEOAWallet, close: closeConnectEOAWallet } = useModal({
		component: ConnectSignerModal,
		attrs: {
			type: 'eoa-wallet',
			onClose: () => closeConnectEOAWallet(),
		},
		slots: {},
	})

	const { open: openConnectPasskeyBoth, close: closeConnectPasskeyBoth } = useModal({
		component: ConnectSignerModal,
		attrs: {
			type: 'passkey-both',
			onClose: () => closeConnectPasskeyBoth(),
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
