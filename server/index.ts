import { alchemy, AlchemyChain, pimlico, PimlicoChain, tenderly, TenderlyChain } from 'evm-providers'
import { Env, validateEnv } from './env'
import { getTenderlyApiKey } from './getTenderlyApiKey'

let envValidated = false

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

		if (url.pathname === '/health') {
			return Response.json({ status: 'ok' }, { status: 200 })
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
				return Response.json({ error: '[SAManager server] Chain ID is required' }, { status: 400 })
			}

			const provider = url.searchParams.get('provider')
			if (!provider) {
				return Response.json({ error: '[SAManager server] Provider is required' }, { status: 400 })
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

			return proxyRequest(request, providerUrl)
		}

		if (url.pathname === '/etherscan') {
			// Create the base URL with API key
			const etherscanUrl = new URL(`https://api.etherscan.io/v2/api`)
			etherscanUrl.searchParams.set('apikey', env.ETHERSCAN_API_KEY)

			// Append all original query parameters
			url.searchParams.forEach((value, key) => {
				etherscanUrl.searchParams.set(key, value)
			})

			return proxyRequest(request, etherscanUrl.toString())
		}

		return new Response(null, { status: 404 })
	},
}

async function proxyRequest(request: Request, url: string) {
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

		return new Response(upstreamResponse.body, {
			status: upstreamResponse.status,
			headers: responseHeaders,
		})
	} catch (e: unknown) {
		return Response.json({ error: `Failed to proxy provider request: ${(e as Error).message}` }, { status: 500 })
	}
}
