import { alchemy, pimlico } from 'evm-providers'
import { Chain as AlchemyChain } from 'evm-providers/dist/providers/alchemy'
import { Chain as PimlicoChain } from 'evm-providers/dist/providers/pimlico'

export interface Env {
	ALCHEMY_API_KEY: string
	PIMLICO_API_KEY: string
	APP_SALT: string
}

let envValidated = false

function validateEnv(env: Env) {
	if (!env.ALCHEMY_API_KEY) throw new Error('Missing ALCHEMY_API_KEY')
	if (!env.PIMLICO_API_KEY) throw new Error('Missing PIMLICO_API_KEY')
	if (!env.APP_SALT) throw new Error('Missing APP_SALT')
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (!envValidated) {
			try {
				validateEnv(env)
				envValidated = true
			} catch (e) {
				return Response.json({ error: `Server is not ready: ${(e as Error).message}` }, { status: 503 })
			}
		}

		const url = new URL(request.url)

		if (url.pathname === '/env.json') {
			return Response.json({
				APP_SALT: env.APP_SALT,
			})
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
