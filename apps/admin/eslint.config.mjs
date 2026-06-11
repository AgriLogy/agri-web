import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';

const config = [
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'node_modules/**'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  eslintConfigPrettier,
  {
    name: 'agrilogy/custom-rules',
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    name: 'agrilogy/react-hooks-overrides',
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Downgraded to warn: many existing hooks (hydration gates, fetch-on-mount)
      // call setState inside effects intentionally. Migrate incrementally rather
      // than block CI on a strict upgrade.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
