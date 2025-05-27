export const env: {
	APP_SALT: string
	VITE_PASSKEY_RP_URL: string
} = {
	APP_SALT: '',
	VITE_PASSKEY_RP_URL: '',
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
