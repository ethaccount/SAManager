import { useEOAWallet } from '@/stores/useEOAWallet'
import { BrowserWalletConnector, useVueDapp } from '@vue-dapp/core'
import '@vue-dapp/modal/dist/style.css'

export function useSetupVueDapp() {
	const { addConnectors, watchWalletChanged, watchDisconnect } = useVueDapp()

	addConnectors([new BrowserWalletConnector()])

	const { setWallet, resetWallet } = useEOAWallet()

	watchWalletChanged(async wallet => {
		setWallet(wallet.provider)
	})

	watchDisconnect(() => {
		resetWallet()
	})
}
