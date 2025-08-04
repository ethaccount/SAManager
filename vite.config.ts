import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import htmlPlugin from 'vite-plugin-html-config'
import htmlConfig from './html.config'
import { cloudflare } from '@cloudflare/vite-plugin'

// import { analyzer } from 'vite-bundle-analyzer'

// https://vitejs.dev/config/
export default defineConfig(configEnv => {
	const isProduction = configEnv.mode === 'production'

	return {
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
			htmlPlugin(htmlConfig),
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
