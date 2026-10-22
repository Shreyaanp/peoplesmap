import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'storybook-static', 'playwright-report', 'test-results', '.lighthouseci', 'dev-dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Motion values must come from src/motion/tokens.ts, never inline numbers.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXAttribute[name.name='transition'] Property[key.name=/^(duration|stiffness|damping|mass|ease)$/] > Literal",
          message: 'Use motion tokens from src/motion/tokens.ts instead of inline transition values.',
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'e2e/**', '.storybook/**'],
    languageOptions: { globals: globals.node },
  },
);
