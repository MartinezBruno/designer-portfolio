import { defineConfig, envField, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { site } from './src/data/site';
import { defaultLocale, locales } from './src/i18n/config';

const fallbacks = ['ui-sans-serif', 'system-ui', 'sans-serif'];

export default defineConfig({
  site: site.url,
  // Pages stay prerendered (static default); the adapter adds one on-demand Worker for /_actions/*.
  // Vitest loads this config through getViteConfig(): with the real adapter the Cloudflare Vite plugin
  // fails ("There is already a server associated with the config"), and with no adapter Actions refuse
  // to load (ActionsWithoutServerOutputError), so unit tests get a no-op stand-in.
  // prerenderEnvironment 'node': prerendering in workerd trips the offline guard (DNS lookup of
  // 0.0.0.0 from the plugin's port check); on-demand code still runs in workerd in dev and preview.
  adapter: process.env['VITEST']
    ? {
        name: 'vitest-adapter-stub',
        hooks: {
          'astro:config:done': ({ setAdapter }) => {
            setAdapter({
              name: 'vitest-adapter-stub',
              serverEntrypoint: 'astro/app',
              supportedAstroFeatures: {
                staticOutput: 'stable',
                hybridOutput: 'stable',
                serverOutput: 'stable',
              },
            });
          },
        },
      }
    : cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' }),
  // No KV "SESSION" binding: the adapter would otherwise auto-enable sessions.
  session: false,
  env: {
    // Server vars are access 'secret' so they are read at runtime, never inlined into dist (D-20, D-21).
    // They are optional on purpose: a missing required secret throws at action-module load and turns
    // every call into a 500; createMailer and verifyTurnstile validate them and fail loudly instead.
    schema: {
      MAILER: envField.enum({
        context: 'server',
        access: 'secret',
        values: ['console', 'resend', 'cloudflare'], // cloudflare: EMAIL send_email binding
        default: 'console',
      }),
      // Local/e2e opt-in for the console mailer and Turnstile test keys. Unset in a deploy, so a
      // forgotten MAILER or test key fails closed instead of dropping leads (WR-04).
      CONTACT_ALLOW_TEST_CONFIG: envField.boolean({
        context: 'server',
        access: 'secret',
        default: false,
      }),
      CONTACT_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      // Defaults to Cloudflare's always-pass visible test sitekey.
      // Real sitekey comes from the shell at deploy (docs/DEPLOY.md), never .env or .dev.vars.
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        default: '1x00000000000000000000AA',
      }),
    },
  },
  // /sitemap-index.xml + /sitemap-0.xml with en/es hreflang alternates, from `site`. Only
  // prerendered pages are listed (the /_actions Worker route never is); the 404 pages are dropped.
  integrations: [
    sitemap({
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(locales.map((locale) => [locale, locale])),
      },
      filter: (page) => !/\/404\/?$/.test(new URL(page).pathname),
    }),
  ],
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
