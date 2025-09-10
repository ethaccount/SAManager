import { defineConfig } from 'vitest/config'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
	plugins: [
		vue(),
		AutoImport({
			imports: ['vue', 'vue-router', 'pinia', '@vueuse/core', 'vitest'],
		}),
	],
	test: {
		globals: true, // @docs https://vitest.dev/config/#globals
		environment: 'happy-dom', // Provides browser-like environment with window object
		include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
		testTimeout: 1_000_000,
	},
	resolve: {
		alias: { '@': path.resolve(__dirname, 'src') },
	},
	define: {
		// development
		APP_SALT: JSON.stringify('0xa581872589a5bce5483964bef2a258f2cbf64f66e19db1727f828c96dcf9db00'),
		APP_SESSION_SIGNER_ADDRESS: JSON.stringify('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'),
		APP_PUSH_FEEDBACK_PROJECT_ID: JSON.stringify('oc9bd4ntqh'),
	},
})
