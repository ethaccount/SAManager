import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
	plugins: [
		dts({
			tsconfigPath: './tsconfig.json',
			insertTypesEntry: true,
			rollupTypes: false,
			include: ['src/**/*.ts'],
		}),
		visualizer({
			open: false,
			gzipSize: true,
			brotliSize: true,
			template: 'treemap', // or 'sunburst', 'network'
		}),
	],
	build: {
		sourcemap: true,
		lib: {
			entry: {
				index: 'src/index.ts',
			},
			formats: ['es'],
		},
		outDir: 'dist',
	},
})

// Vite Library Mode https://vitejs.dev/guide/build.html#library-mode
// https://github.com/qmhc/vite-plugin-dts
