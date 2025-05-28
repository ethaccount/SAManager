import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import htmlPlugin from 'vite-plugin-html-config'
import { htmlConfig } from './htmlConfig'
import { cloudflare } from '@cloudflare/vite-plugin'

// import { analyzer } from 'vite-bundle-analyzer'

// https://vitejs.dev/config/
export default defineConfig({
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
		cloudflare(),
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
				manualChunks: {
					sendop: ['sendop'],
					ethers: ['ethers'],
					'radix-vue': ['radix-vue'],
					'@vueuse/core': ['@vueuse/core'],
				},
			},
		},
	},
})
