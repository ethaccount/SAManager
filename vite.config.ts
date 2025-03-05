import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		nodePolyfills(),
		AutoImport({
			dts: 'src/auto-import.d.ts',
			imports: ['vue', 'vue-router', 'pinia'],
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
		},
	},
})
