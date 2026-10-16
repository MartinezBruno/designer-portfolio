import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { site } from './src/data/site';
import { defaultLocale, locales } from './src/i18n/config';

const fallbacks = ['ui-sans-serif', 'system-ui', 'sans-serif'];

export default defineConfig({
  site: site.url,
  i18n: {
    locales: [...locales],
    defaultLocale,
    routing: { prefixDefaultLocale: false },
  },
  // TODO(martina): brand fonts pending. Local provider reads package files, so builds work offline
  // (npm/google/fontsource providers fetch from a CDN at build time).
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      fallbacks,
      options: {
        variants: [
          {
            src: ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'],
            weight: '100 900',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Bricolage Grotesque',
      cssVariable: '--font-bricolage',
      fallbacks,
      options: {
        variants: [
          {
            src: [
              '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
            ],
            weight: '200 800',
            style: 'normal',
          },
        ],
      },
    },
  ],
  vite: { plugins: [tailwindcss()] },
});
