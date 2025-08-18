import { standardErrors } from './error'

const POPUP_WIDTH = 420
const POPUP_HEIGHT = 700

export function openPopup(url: URL): Promise<Window> {
	const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX
	const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY

	function tryOpenPopup(): Window | null {
		const popupId = `wallet_${crypto.randomUUID()}`
		const popup = window.open(
			url,
			popupId,
			`width=${POPUP_WIDTH}, height=${POPUP_HEIGHT}, left=${left}, top=${top}`,
		)

		popup?.focus()

		if (!popup) {
			return null
		}

		return popup
	}

	const popup = tryOpenPopup()

	// If the popup was blocked, reject the promise
	if (!popup) {
		return Promise.reject(standardErrors.rpc.internal('Popup window blocked'))
	}

	return Promise.resolve(popup)
}

export function closePopup(popup: Window | null) {
	if (popup && !popup.closed) {
		popup.close()
	}
}
