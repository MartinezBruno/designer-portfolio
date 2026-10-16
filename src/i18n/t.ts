import type { Locale } from './config';
import { en, type UIKey } from './ui.en';
import { es } from './ui.es';

export { isLocale, locales, type Locale } from './config';
export type { UIKey } from './ui.en';

const dictionaries = { en, es } as const;

export function useTranslations(locale: Locale): (key: UIKey) => string {
  const dictionary = dictionaries[locale];
  return (key) => dictionary[key];
}

// Replaces `{name}` tokens with values; tokens without a value are left as-is.
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (token, name: string) => {
    const value = values[name];
    return value === undefined ? token : String(value);
  });
}
