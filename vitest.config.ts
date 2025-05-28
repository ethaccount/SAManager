import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
	test: {
		globals: true, // @docs https://vitest.dev/config/#globals
		include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
		testTimeout: 1_000_000,
	},
	resolve: {
		alias: { '@': path.resolve(__dirname, 'src') },
	},
})
