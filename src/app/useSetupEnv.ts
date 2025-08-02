// Frontend env usage
export const env: {
	ENVIRONMENT: string
	APP_SALT: string
	SESSION_SIGNER_ADDRESS: string
} = {
	ENVIRONMENT: '',
	APP_SALT: '',
	SESSION_SIGNER_ADDRESS: '',
}

export function useSetupEnv() {
	async function setupEnv() {
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

			if (!env.ENVIRONMENT) {
				throw new Error('ENVIRONMENT is not set')
			}
		} catch (err: unknown) {
			console.error(err)
			throw err
		}
	}

	return {
		setupEnv,
	}
}
