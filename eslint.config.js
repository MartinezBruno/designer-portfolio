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
  // Client bundle boundary (05-05, T-05-26): modules that ship to the browser must not value-import
  // zod (about 22.7 KB gzip), server env, or t.ts / the ui.* dictionaries (both languages in every
  // page). Copy reaches the client pre-resolved as JSON instead. The typescript-eslint rule (not
  // core no-restricted-imports) so `import type { … }` passes: it is erased at compile and ships
  // no bytes. Type imports must use the `import type` statement form.
  {
    files: [
      'src/lib/ui/**',
      'src/i18n/interpolate.ts',
      'src/lib/contact/fields.ts',
      'src/lib/contact/errors.ts',
      'src/lib/contact/validate.ts',
      'src/lib/contact/mailto.ts',
      'src/lib/contact/service-param.ts',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['astro/zod', 'astro:env/server'],
              allowTypeImports: true,
              message:
                'client bundle: zod is 22.7 KB gzip and t.ts ships both dictionaries (05-RESEARCH)',
            },
            {
              group: ['**/i18n/t', '**/i18n/ui.*'],
              allowTypeImports: true,
              message:
                'client bundle: zod is 22.7 KB gzip and t.ts ships both dictionaries (05-RESEARCH)',
            },
          ],
        },
      ],
    },
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
);
