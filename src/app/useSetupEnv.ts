export const env: {
	APP_SALT: string
	VITE_PASSKEY_RP_URL: string
	CLOUDFLARE_ANALYTICS_TOKEN: string
} = {
	APP_SALT: '',
	VITE_PASSKEY_RP_URL: '',
	CLOUDFLARE_ANALYTICS_TOKEN: '',
}

export function useSetupEnv() {
	onMounted(async () => {
		try {
			const response = await fetch('/env.json')
			const data = await response.json()

			if (data.error) {
				throw new Error(data.error)
			}

			Object.assign(env, data)

			if (!env.APP_SALT) {
				throw new Error('APP_SALT is not set')
			}

			// Load Cloudflare Web Analytics only in production
			if (import.meta.env.PROD) {
				if (!env.CLOUDFLARE_ANALYTICS_TOKEN) {
					throw new Error('CLOUDFLARE_ANALYTICS_TOKEN is not set')
				}

				const script = document.createElement('script')
				script.defer = true
				script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
				script.setAttribute('data-cf-beacon', `{"token": "${env.CLOUDFLARE_ANALYTICS_TOKEN}"}`)
				document.head.appendChild(script)
				console.log('Cloudflare Web Analytics loaded')
			}
		} catch (err: unknown) {
			console.error(err)
			throw err
		}
	})
}
