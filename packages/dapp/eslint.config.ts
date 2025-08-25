import pluginVue from "eslint-plugin-vue";
import eslintrcAutoImport from "./.eslintrc-auto-import.json" assert { type: "json" };
import pluginPinia from "eslint-plugin-pinia";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import pluginVitest from "@vitest/eslint-plugin";

// @docs https://github.com/vuejs/eslint-config-typescript/?tab=readme-ov-file#vueeslint-config-typescript
export default defineConfigWithVueTs(
  {
    files: ["src/**/*.vue", "src/**/*.ts"],
  },
  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  // @ts-expect-error pinia config is not typed
  {
    ...pluginPinia.configs["recommended-flat"],
  },

  {
    ...pluginVitest.configs.recommended,
    files: ["src/**/*.test.ts"],
  },

  {
    languageOptions: {
      globals: {
        ...eslintrcAutoImport.globals,
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".wrangler/**",
      "**/*.d.ts",

      // shadcn-vue
      "src/lib/utils.ts",
      "src/components/ui/**",
    ],
  },
);
