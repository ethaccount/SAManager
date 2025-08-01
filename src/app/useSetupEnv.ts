// Frontend env usage
export const env: {
	APP_SALT: string
	CLOUDFLARE_ANALYTICS_TOKEN: string
	SESSION_SIGNER_ADDRESS: string
} = {
	APP_SALT: '',
	CLOUDFLARE_ANALYTICS_TOKEN: '',
	SESSION_SIGNER_ADDRESS: '',
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
		} catch (err: unknown) {
			console.error(err)
			throw err
		}
	})
}
