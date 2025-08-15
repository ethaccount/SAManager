import { SAManagerProvider } from './SAManagerProvider'

export function announceSAManagerProvider({ samanagerUrl }: { samanagerUrl: string }) {
	window.dispatchEvent(
		new CustomEvent('eip6963:announceProvider', {
			detail: {
				info: {
					uuid: crypto.randomUUID(),
					name: 'SAManager',
					icon: 'https://samanager.xyz/favicon_io/favicon-32x32.png',
					rdns: 'xyz.samanager',
				},
				provider: new SAManagerProvider({ samanagerUrl }),
			},
		}),
	)
}
