import { useEOA } from '@/stores/useEOA'
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'

export function useSetupVueDapp() {
	const { addConnectors, watchWalletChanged, watchDisconnect } = useVueDapp()

	addConnectors([new BrowserWalletConnector()])

	const { setWallet, resetWallet } = useEOA()

	watchWalletChanged(async wallet => {
		setWallet(wallet.provider)
	})

	watchDisconnect(() => {
		resetWallet()
	})
}
