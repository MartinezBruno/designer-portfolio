import type { Locale } from './config';
import { en, type UIKey } from './ui.en';
import { es } from './ui.es';

export { isLocale, locales, type Locale } from './config';
export type { UIKey } from './ui.en';
// Lives in its own file so client code can import it without bundling the dictionaries.
export { interpolate } from './interpolate';

const dictionaries = { en, es } as const;

export function useTranslations(locale: Locale): (key: UIKey) => string {
  const dictionary = dictionaries[locale];
  return (key) => dictionary[key];
}
