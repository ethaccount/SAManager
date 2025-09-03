import { alchemy, AlchemyChain, pimlico, PimlicoChain, tenderly, TenderlyChain } from 'evm-providers'
import { Env, validateEnv } from './env'
import { getTenderlyApiKey } from './getTenderlyApiKey'

let envValidated = false

const ALLOWED_ORIGINS = ['https://samanager.xyz', 'https://testnet.samanager.xyz']

function isOriginAllowed(origin: string | null, env: Env): boolean {
	// Same-origin requests (your frontend) - no Origin
	if (!origin) return true

	if (ALLOWED_ORIGINS.includes(origin)) return true

	// Only allow localhost when explicitly set IS_LOCAL_DEV in env
	if (env.IS_LOCAL_DEV && origin.startsWith('http://localhost')) return true

	return false
}

function addCorsHeaders(response: Response, origin: string | null, env: Env): Response {
	if (!isOriginAllowed(origin, env)) return response

	const headers = new Headers(response.headers)
	headers.set('Access-Control-Allow-Origin', origin!)
	headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Secret')
	headers.set('Access-Control-Max-Age', '86400')

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = request.headers.get('Origin')

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			if (!isOriginAllowed(origin, env)) {
				return new Response(null, { status: 403 })
			}

			return addCorsHeaders(new Response(null, { status: 204 }), origin, env)
		}

		// Check origin for all other requests
		if (!isOriginAllowed(origin, env)) {
			return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			})
		}

		if (!envValidated) {
			try {
				validateEnv(env)
				envValidated = true
			} catch (e) {
				const response = Response.json(
					{ error: `Worker is not ready: ${(e as Error).message}` },
					{ status: 503 },
				)
				return addCorsHeaders(response, origin, env)
			}
		}

		const url = new URL(request.url)

		if (url.pathname === '/health') {
			const response = Response.json({ status: 'ok' }, { status: 200 })
			return addCorsHeaders(response, origin, env)
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

				const response = new Response(upstreamResponse.body, {
					status: upstreamResponse.status,
					headers: responseHeaders,
				})
				return addCorsHeaders(response, origin, env)
			} catch (e: unknown) {
				const response = Response.json(
					{ error: `Failed to proxy backend request: ${(e as Error).message}` },
					{ status: 500 },
				)
				return addCorsHeaders(response, origin, env)
			}
		}

		if (url.pathname === '/api/provider') {
			const chainId = url.searchParams.get('chainId')
			if (!chainId) {
				const response = Response.json({ error: '[SAManager server] Chain ID is required' }, { status: 400 })
				return addCorsHeaders(response, origin, env)
			}

			const provider = url.searchParams.get('provider')
			if (!provider) {
				const response = Response.json({ error: '[SAManager server] Provider is required' }, { status: 400 })
				return addCorsHeaders(response, origin, env)
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
						const response = Response.json(
							{ error: `Tenderly not supported for chain ${chainId}` },
							{ status: 400 },
						)
						return addCorsHeaders(response, origin, env)
					}
					providerUrl = tenderly(chainIdNum as TenderlyChain, tenderlyApiKey)
					break
				case 'etherspot-v2': // for entrypoint v0.7
					providerUrl = `https://testnet-rpc.etherspot.io/v2/${chainIdNum}?api-key=${env.ETHERSPOT_API_KEY}`
					break
				case 'etherspot-v3': // for entrypoint v0.8
					providerUrl = `https://testnet-rpc.etherspot.io/v3/${chainIdNum}?api-key=${env.ETHERSPOT_API_KEY}`
					break
				case 'candide':
					providerUrl = `https://api.candide.dev/api/v3/${chainIdNum}/${env.CANDIDE_API_KEY}`
					break
			}

			return proxyRequest(request, providerUrl, origin, env)
		}

		if (url.pathname === '/etherscan') {
			// Create the base URL with API key
			const etherscanUrl = new URL(`https://api.etherscan.io/v2/api`)
			etherscanUrl.searchParams.set('apikey', env.ETHERSCAN_API_KEY)

			// Append all original query parameters
			url.searchParams.forEach((value, key) => {
				etherscanUrl.searchParams.set(key, value)
			})

			return proxyRequest(request, etherscanUrl.toString(), origin, env)
		}

		const response = new Response(null, { status: 404 })
		return addCorsHeaders(response, origin, env)
	},
}

async function proxyRequest(request: Request, url: string, origin: string | null, env: Env) {
	try {
		const upstreamRequest = new Request(url, {
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

		const response = new Response(upstreamResponse.body, {
			status: upstreamResponse.status,
			headers: responseHeaders,
		})
		return addCorsHeaders(response, origin, env)
	} catch (e: unknown) {
		const response = Response.json(
			{ error: `Failed to proxy provider request: ${(e as Error).message}` },
			{ status: 500 },
		)
		return addCorsHeaders(response, origin, env)
	}
}
