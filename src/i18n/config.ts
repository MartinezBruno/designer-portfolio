export const locales = ['en', 'es'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export function isLocale(value: string | undefined): value is Locale {
  return locales.some((locale) => locale === value);
}
