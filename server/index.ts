import { alchemy, pimlico, tenderly, TenderlyChain, AlchemyChain, PimlicoChain } from 'evm-providers'

export interface Env {
	ALCHEMY_API_KEY: string
	PIMLICO_API_KEY: string
	APP_SALT: string
	TENDERLY_API_KEY_SEPOLIA: string
	TENDERLY_API_KEY_OPTIMISM_SEPOLIA: string
	TENDERLY_API_KEY_ARBITRUM_SEPOLIA: string
	TENDERLY_API_KEY_BASE_SEPOLIA: string
	TENDERLY_API_KEY_POLYGON_AMOY: string
	BACKEND_URL: string
	API_SECRET: string
	CLOUDFLARE_ANALYTICS_TOKEN: string
}

let envValidated = false

function validateEnv(env: Env) {
	if (!env.ALCHEMY_API_KEY) throw new Error('Missing ALCHEMY_API_KEY')
	if (!env.PIMLICO_API_KEY) throw new Error('Missing PIMLICO_API_KEY')
	if (!env.APP_SALT) throw new Error('Missing APP_SALT')
	if (!env.TENDERLY_API_KEY_SEPOLIA) throw new Error('Missing TENDERLY_API_KEY_SEPOLIA')
	if (!env.TENDERLY_API_KEY_OPTIMISM_SEPOLIA) throw new Error('Missing TENDERLY_API_KEY_OPTIMISM_SEPOLIA')
	if (!env.TENDERLY_API_KEY_ARBITRUM_SEPOLIA) throw new Error('Missing TENDERLY_API_KEY_ARBITRUM_SEPOLIA')
	if (!env.TENDERLY_API_KEY_BASE_SEPOLIA) throw new Error('Missing TENDERLY_API_KEY_BASE_SEPOLIA')
	if (!env.TENDERLY_API_KEY_POLYGON_AMOY) throw new Error('Missing TENDERLY_API_KEY_POLYGON_AMOY')
	if (!env.BACKEND_URL) throw new Error('Missing BACKEND_URL')
	if (!env.API_SECRET) throw new Error('Missing API_SECRET')
	if (!env.CLOUDFLARE_ANALYTICS_TOKEN) throw new Error('Missing CLOUDFLARE_ANALYTICS_TOKEN')
}

function getTenderlyApiKey(chainId: number, env: Env): string | null {
	switch (chainId) {
		case 11155111: // SEPOLIA
			return env.TENDERLY_API_KEY_SEPOLIA
		case 11155420: // OPTIMISM_SEPOLIA
			return env.TENDERLY_API_KEY_OPTIMISM_SEPOLIA
		case 421614: // ARBITRUM_SEPOLIA
			return env.TENDERLY_API_KEY_ARBITRUM_SEPOLIA
		case 84532: // BASE_SEPOLIA
			return env.TENDERLY_API_KEY_BASE_SEPOLIA
		case 80002: // POLYGON_AMOY
			return env.TENDERLY_API_KEY_POLYGON_AMOY
		default:
			return null
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (!envValidated) {
			try {
				validateEnv(env)
				envValidated = true
			} catch (e) {
				return Response.json({ error: `Worker is not ready: ${(e as Error).message}` }, { status: 503 })
			}
		}

		const url = new URL(request.url)

		if (url.pathname === '/env.json') {
			return Response.json({
				APP_SALT: env.APP_SALT,
				CLOUDFLARE_ANALYTICS_TOKEN: env.CLOUDFLARE_ANALYTICS_TOKEN,
			})
		}

		if (url.pathname.startsWith('/backend')) {
			// Proxy requests to backend service
			const backendPath = url.pathname.replace('/backend', '/api/v1')
			const backendUrl = new URL(backendPath + url.search, env.BACKEND_URL)

			try {
				const upstreamRequest = new Request(backendUrl.toString(), {
					method: request.method,
					headers: {
						...Object.fromEntries(request.headers.entries()),
						'X-API-Secret': env.API_SECRET,
					},
					body: request.body,
					redirect: 'manual',
				})

				const upstreamResponse = await fetch(upstreamRequest)

				const responseHeaders = new Headers(upstreamResponse.headers)
				responseHeaders.delete('content-encoding')

				return new Response(upstreamResponse.body, {
					status: upstreamResponse.status,
					headers: responseHeaders,
				})
			} catch (e: unknown) {
				return Response.json(
					{ error: `Failed to proxy backend request: ${(e as Error).message}` },
					{ status: 500 },
				)
			}
		}

		if (url.pathname === '/api/provider') {
			const chainId = url.searchParams.get('chainId')
			if (!chainId) {
				return Response.json({ error: 'Chain ID is required' }, { status: 400 })
			}

			const provider = url.searchParams.get('provider')
			if (!provider) {
				return Response.json({ error: 'Provider is required' }, { status: 400 })
			}

			const chainIdNum = Number(chainId)
			let providerUrl = ''

			switch (provider) {
				case 'alchemy':
					providerUrl = alchemy(chainIdNum as AlchemyChain, env.ALCHEMY_API_KEY)
					break
				case 'pimlico':
					providerUrl = pimlico(chainIdNum as PimlicoChain, env.PIMLICO_API_KEY)
					break
				case 'tenderly':
					const tenderlyApiKey = getTenderlyApiKey(chainIdNum, env)
					if (!tenderlyApiKey) {
						return Response.json({ error: `Tenderly not supported for chain ${chainId}` }, { status: 400 })
					}
					providerUrl = tenderly(chainIdNum as TenderlyChain, tenderlyApiKey)
					break
			}

			try {
				const upstreamRequest = new Request(providerUrl, {
					method: request.method,
					headers: request.headers,
					body: request.body,
					redirect: 'manual',
				})

				const upstreamResponse = await fetch(upstreamRequest)

				// @note Remove content-encoding header when proxying streamed responses
				// For alchmey, this is essential to avoid truncatation of the response
				const responseHeaders = new Headers(upstreamResponse.headers)
				responseHeaders.delete('content-encoding')

				return new Response(upstreamResponse.body, {
					status: upstreamResponse.status,
					headers: responseHeaders,
				})
			} catch (e: unknown) {
				return Response.json(
					{ error: `Failed to proxy provider request: ${(e as Error).message}` },
					{ status: 500 },
				)
			}
		}

		return new Response(null, { status: 404 })
	},
}
