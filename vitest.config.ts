import { defineConfig } from 'vitest/config'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
	plugins: [
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
})
