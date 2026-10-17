import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default defineConfig(
  globalIgnores([
    'dist/',
    '.astro/',
    'node_modules/',
    'test-results/',
    'playwright-report/',
    'tmp/',
  ]),
  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],
  // Tool tiles are focusable role="img" so keyboard users can reach their tooltip; the name comes
  // from aria-labelledby (CONTEXT D-14, UI-SPEC "Semantics decision"). Scoped to this one file:
  // the rule stays fully strict everywhere else.
  {
    files: ['src/components/sections/ToolsRow.astro'],
    rules: {
      'astro/jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['img'], tags: [] }],
    },
  },
  // DATA-06 (CONTEXT D-23): the UI depends on the project model and queries.ts only, never on a
  // source adapter, so swapping Behance for another source never touches components or pages.
  {
    files: ['src/components/**', 'src/pages/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/sources/**'],
              message:
                'DATA-06 (D-23): UI reads projects only through src/lib/content/queries.ts and the model types, never the source adapter.',
            },
          ],
        },
      ],
    },
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
);
