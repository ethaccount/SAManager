import ConnectSignerModal from '@/components/signer/ConnectSignerModal.vue'
import { useModal } from 'vue-final-modal'

export function useConnectSignerModal() {
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
}
