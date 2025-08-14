import { defineConfig } from 'vite'
import path from 'path'
import dts from 'vite-plugin-dts'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
	resolve: {
		alias: { '@': path.resolve(__dirname, 'src') },
	},
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
			formats: ['es'], // only ES modules
			fileName: (_format, entryName) => `${entryName}.js`,
		},
		outDir: 'dist',
	},
})

// Vite Library Mode https://vitejs.dev/guide/build.html#library-mode
// https://github.com/qmhc/vite-plugin-dts
