import type { ProviderEventMap, ProviderInterface, RequestArguments } from './types'

export class SAManagerProvider implements ProviderInterface {
	private samanagerUrl: string

	constructor({ samanagerUrl }: { samanagerUrl: string }) {
		this.samanagerUrl = samanagerUrl
	}

	async request({ method, params }: RequestArguments) {
		console.log('request', method, params)
		switch (method) {
			case 'eth_requestAccounts':
				const popup = window.open(
					this.samanagerUrl, // Your wallet app URL
					'connect',
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
	}

	async disconnect(): Promise<void> {
		// TODO: Implement wallet disconnect logic
		console.log('disconnect called')
	}

	emit<K extends keyof ProviderEventMap>(event: K, payload: ProviderEventMap[K]): void {
		// TODO: Implement event emission logic
		console.log('emit', event, payload)
	}

	on<K extends keyof ProviderEventMap>(event: K, handler: (payload: ProviderEventMap[K]) => void): void {
		console.log('on', event, handler)
		// TODO: Implement event listener registration
	}

	removeListener<K extends keyof ProviderEventMap>(event: K, handler: (payload: ProviderEventMap[K]) => void): void {
		console.log('removeListener', event, handler)
		// TODO: Implement event listener removal
	}
}
