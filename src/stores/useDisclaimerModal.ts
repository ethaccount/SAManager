import { useConfirmModal } from '@/components/ConfirmModal/useConfirmModal'
import { IS_PRODUCTION, TESTNET_URL } from '@/config'
import { defineStore, storeToRefs } from 'pinia'

export const useDisclaimerModalStore = defineStore(
	'useDisclaimerModalStore',
	() => {
		const { openModal } = useConfirmModal()
		const hasAcceptedDisclaimer = ref<boolean>(false)

		function showDisclaimerIfNeeded() {
			if (!IS_PRODUCTION || hasAcceptedDisclaimer.value) {
				return
			}

			const disclaimerMessage = `This application is experimental.
            <span class="font-bold">Please use at your own risk.</span> <br><br>
            You can try the <a href="${TESTNET_URL}" target="_blank" class="text-blue-500">testnet version</a> to explore the features safely.`

			openModal({
				title: 'Disclaimer',
				message: disclaimerMessage,
				htmlMessage: true,
				confirmText: 'I Understand, Continue',
				cancelText: 'Go to Testnet',
				showCloseButton: false,
				clickToClose: false,
				escToClose: false,
				showDontShowAgain: true,
				dontShowAgainText: "Don't show this disclaimer again",
				onConfirm: (dontShowAgain?: boolean) => {
					if (dontShowAgain) {
						hasAcceptedDisclaimer.value = true
					}
				},
				onCancel: () => {
					window.open(TESTNET_URL, '_self')
				},
			})
		}

		return {
			showDisclaimerIfNeeded,
			hasAcceptedDisclaimer,
		}
	},
	{
		persist: true,
	},
)

export function useDisclaimerModal() {
	const store = useDisclaimerModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
