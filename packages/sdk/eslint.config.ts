import pluginVitest from '@vitest/eslint-plugin'
import tseslint from 'typescript-eslint'

export default [
	...tseslint.configs.recommended,
	{
		...pluginVitest.configs.recommended,
		files: ['**/*.test.ts'],
	},
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
		},
		rules: {
			// Allow explicit any - SDK needs flexibility
			'@typescript-eslint/no-explicit-any': 'off',

			// Relax other strict TypeScript rules for SDK development
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/ban-ts-comment': 'warn',
		},
	},
	{
		ignores: ['node_modules/**', 'dist/**', '**/*.d.ts'],
	},
]
