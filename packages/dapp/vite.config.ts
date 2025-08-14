import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		vueDevTools(),
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
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'samanager-sdk': fileURLToPath(new URL('../sdk/src', import.meta.url)),
		},
	},
})
