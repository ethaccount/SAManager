/**
 * Auto-click SAManager wallet option
 */
export function autoClickSAManager() {
	const checkAndClick = () => {
		// Look for the modal
		const modal = document.getElementById('vd-modal') || document.querySelector('.vd-modal-column')
		if (modal) {
			// Find all wallet blocks
			const walletBlocks = modal.querySelectorAll('.vd-wallet-block')

			// Look for SAManager specifically
			for (const block of walletBlocks) {
				const walletName = block.querySelector('div')?.textContent?.trim()

				// Check if this is SAManager by name
				if (walletName === 'SAManager') {
					console.log('Auto-clicking SAManager wallet')
					;(block as HTMLElement).click()
					return true
				}
			}
		}
		return false
	}

	// Try immediately
	if (checkAndClick()) return
}
