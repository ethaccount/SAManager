import pluginVue from 'eslint-plugin-vue'
import eslintrcAutoImport from './.eslintrc-auto-import.json' assert { type: 'json' }
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import pinia from 'eslint-plugin-pinia'

export default [
	...pluginVue.configs['flat/essential'],
	pinia.configs['recommended-flat'],
	{
		files: ['**/*.vue', '**/*.ts'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tsParser,
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
			globals: {
				...eslintrcAutoImport.globals,
			},
		},
		rules: {
			'vue/multi-word-component-names': 'off',
		},
	},
	// Ignore patterns
	{
		ignores: ['node_modules/**', 'dist/**', '.wrangler/**', '**/*.d.ts', 'eslint.config.ts'],
	},
]
