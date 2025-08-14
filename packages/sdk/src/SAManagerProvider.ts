import type { EIP1193Provider, EIP6963ProviderDetail } from '@vue-dapp/core'

const SAManagerProvider: EIP1193Provider = {
	request: async ({ method, params }) => {
		console.log('request', method, params)
		switch (method) {
			case 'eth_requestAccounts':
				const popup = window.open(
					'http://localhost:5173', // Your wallet app URL
					'wallet-connect',
					'width=600,height=600,scrollbars=yes,resizable=yes',
				)
				if (!popup) {
					throw new Error('Popup failed to open')
				}
				return popup.postMessage('eth_requestAccounts', '*')

			case 'eth_chainId':
				return '0x1'

			default:
				throw new Error(`Method ${method} not supported`)
		}
	},
	on: (event, handler) => {
		console.log('on', event, handler)
	},
	removeListener: (event, handler) => {
		console.log('removeListener', event, handler)
	},
}

export const SAManagerProviderDetail: EIP6963ProviderDetail = {
	info: {
		uuid: crypto.randomUUID(),
		name: 'SAManager',
		icon: 'https://samanager.xyz/favicon_io/favicon-32x32.png',
		rdns: 'xyz.samanager',
	},
	provider: SAManagerProvider,
}

export function announceEIP6963Provider() {
	window.dispatchEvent(
		new CustomEvent('eip6963:announceProvider', {
			detail: SAManagerProviderDetail,
		}),
	)
}
