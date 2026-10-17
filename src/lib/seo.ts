import { locales, type Locale } from '../i18n/config';

export type PageKind = 'page' | 'notFound';

type OgLocale = 'en_US' | 'es_ES';

export interface SeoInput {
  locale: Locale;
  pathname: string;
  kind: PageKind;
  title: string;
  description: string;
  /** Absolute og:image URL. Ignored on 404s. */
  image?: string;
}

export interface SeoTags {
  title: string;
  description: string;
  robots?: 'noindex';
  canonical?: string;
  alternates: { hreflang: Locale | 'x-default'; href: string }[];
  og: {
    title: string;
    description: string;
    locale: OgLocale;
    localeAlternate: OgLocale;
    type: 'website';
    url?: string;
    image?: string;
  };
}

const ogLocales = { en: 'en_US', es: 'es_ES' } as const satisfies Record<Locale, OgLocale>;

/**
 * Pure head-tag builder. `absolute` is injected (routes.absoluteFor in Astro) so this stays
 * testable without astro:i18n. 404s get noindex and no canonical, hreflang or og:url.
 */
export function buildSeo(
  input: SeoInput,
  absolute: (pathname: string, target: Locale) => string,
): SeoTags {
  const { locale, pathname, kind, title, description, image } = input;
  const alternateLocale: Locale = locale === 'en' ? 'es' : 'en';
  const ogBase = {
    title,
    description,
    locale: ogLocales[locale],
    localeAlternate: ogLocales[alternateLocale],
    type: 'website',
  } as const;

  if (kind === 'notFound') {
    return { title, description, robots: 'noindex', alternates: [], og: ogBase };
  }

  const canonical = absolute(pathname, locale);
  return {
    title,
    description,
    canonical,
    alternates: [
      ...locales.map((target) => ({ hreflang: target, href: absolute(pathname, target) })),
      { hreflang: 'x-default', href: absolute(pathname, 'en') },
    ],
    // Spread so pages without an image carry no image key (exactOptionalPropertyTypes).
    og: { ...ogBase, url: canonical, ...(image ? { image } : {}) },
  };
}
