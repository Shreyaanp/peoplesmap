import js from '@eslint/js';
import eslintReact from '@eslint-react/eslint-plugin';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Motion values must come from src/motion/tokens.ts, never inline numbers.
const motionTokensOnly = {
  selector:
    "JSXAttribute[name.name='transition'] Property[key.name=/^(duration|stiffness|damping|mass|ease)$/] > Literal",
  message: 'Use motion tokens from src/motion/tokens.ts instead of inline transition values.',
};

// Context rules (see the peoplemap-ui-rules skill): contexts live in src/state/,
// stay private to their module, and are read only through their typed hooks.
const contextOnlyInState = [
  {
    selector:
      "CallExpression[callee.name='createContext'], CallExpression[callee.property.name='createContext']",
    message: 'Create contexts only in src/state/, behind a Provider and typed hooks.',
  },
  {
    selector:
      "CallExpression[callee.name='useContext'], CallExpression[callee.property.name='useContext'], CallExpression[callee.name='use'] > Identifier[name=/Context$/]",
    message: 'Read context through its hook from src/state/ (e.g. useSearchState()), not useContext/use.',
  },
];
const contextStaysPrivate = {
  selector:
    'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=/Context$/], ExportSpecifier[exported.name=/Context$/], ExportDefaultDeclaration > Identifier[name=/Context$/]',
  message: 'Never export a raw Context object; export its Provider and hooks only.',
};

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-e2e',
      'storybook-static',
      'playwright-report',
      'test-results',
      '.lighthouseci',
      'dev-dist',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, '@eslint-react': eslintReact },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // A Provider value built inline is a new object every render: every reader re-renders.
      '@eslint-react/no-unstable-context-value': 'error',
      '@eslint-react/no-missing-context-display-name': 'error',
      '@eslint-react/naming-convention-context-name': 'error',
      'no-restricted-syntax': ['error', motionTokensOnly, ...contextOnlyInState, contextStaysPrivate],
    },
  },
  {
    files: ['src/state/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', motionTokensOnly, contextStaysPrivate],
      // State modules export a Provider plus its hooks by design.
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}', 'e2e/**', '.storybook/**', 'scripts/**'],
    languageOptions: { globals: globals.node },
  },
);
