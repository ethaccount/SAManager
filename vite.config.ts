import { cloudflare } from '@cloudflare/vite-plugin'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import htmlPlugin from 'vite-plugin-html-config'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import getHtmlConfig from './html.config'

// import { analyzer } from 'vite-bundle-analyzer'

// https://vitejs.dev/config/
export default defineConfig(configEnv => {
	const isDev = process.env.NODE_ENV === 'development' // local development
	const isStaging = configEnv.mode === 'staging' // testnet
	const isProduction = configEnv.mode === 'production' // mainnet

	return {
		// Frontend env
		define: {
			...(isStaging && {
				APP_SALT: JSON.stringify('0x65a4dadb78fe3704825f49a55b251478c1cb1b682139f9c24d2828ac0410f200'),
				APP_SESSION_SIGNER_ADDRESS: JSON.stringify('0xD9030071966102689a8bb6b71A8C2Fc56D1d26a5'),
			}),

			...(isProduction && {
				APP_SALT: JSON.stringify('0x65a4dadb78fe3704825f49a55b251478c1cb1b682139f9c24d2828ac0410f200'),
				APP_SESSION_SIGNER_ADDRESS: JSON.stringify('0xD9030071966102689a8bb6b71A8C2Fc56D1d26a5'),
			}),

			// Must put below the values in staging and production to override them
			...(isDev && {
				APP_SALT: JSON.stringify('0xa581872589a5bce5483964bef2a258f2cbf64f66e19db1727f828c96dcf9db00'),
				APP_SESSION_SIGNER_ADDRESS: JSON.stringify('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'),
			}),
		},
		plugins: [
			vue({
				template: {
					compilerOptions: {
						isCustomElement: tag => tag === 'feedback-button',
					},
				},
			}),

			nodePolyfills(),
			AutoImport({
				dts: 'src/auto-import.d.ts',
				imports: ['vue', 'vue-router', 'pinia', '@vueuse/core', 'vitest'],
				eslintrc: {
					enabled: true,
				},
			}),
			Components({
				dts: 'src/components.d.ts',
			}),
			htmlPlugin(getHtmlConfig(isProduction, isStaging)),
			cloudflare({
				configPath: isProduction ? 'wrangler.production.jsonc' : 'wrangler.staging.jsonc',
			}),
			// analyzer(),
		],
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url)),
			},
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks: (id: string) => {
						// only create manual chunks for client build to prevent from empty chunks
						if (process.env.SSR) return undefined

						if (id.includes('sendop')) return 'sendop'
						if (id.includes('ethers')) return 'ethers'
						if (id.includes('radix-vue')) return 'radix-vue'
						if (id.includes('@vueuse/core')) return '@vueuse/core'
					},
				},
			},
		},
	}
})
