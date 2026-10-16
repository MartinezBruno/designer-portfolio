import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { site } from './src/data/site';
import { defaultLocale, locales } from './src/i18n/config';

export default defineConfig({
  site: site.url,
  i18n: {
    locales: [...locales],
    defaultLocale,
    routing: { prefixDefaultLocale: false },
  },
  vite: { plugins: [tailwindcss()] },
});
