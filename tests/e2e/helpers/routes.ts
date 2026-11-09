// Every page route the axe sweep visits (D-07), derived from the committed snapshot and overrides
// through expectedDetails (not a spec file, so Playwright does not collect it). No slug is written
// here: adding or hiding a project changes the list, and the sweep's build-output guard fails if
// dist/client gains a page this list does not cover.
import { expectedDetails } from './projects.ts';

export type Locale = 'en' | 'es';

export interface SweepRoute {
  path: string;
  locale: Locale;
  kind: 'home' | 'projects' | 'detail' | 'notFound';
}

const LOCALES: readonly Locale[] = ['en', 'es'];

// 08-02: the EN 404 is any unknown path; the ES 404 is rendered on demand at /es/404/ (status 404).
const NOT_FOUND: Record<Locale, string> = { en: '/does-not-exist', es: '/es/404/' };

export function sweepRoutes(): readonly SweepRoute[] {
  return LOCALES.flatMap((locale): SweepRoute[] => {
    const prefix = locale === 'en' ? '/' : '/es/';
    return [
      { path: prefix, locale, kind: 'home' },
      { path: `${prefix}projects/`, locale, kind: 'projects' },
      ...expectedDetails(locale).map((detail): SweepRoute => ({
        path: detail.href,
        locale,
        kind: 'detail',
      })),
      { path: NOT_FOUND[locale], locale, kind: 'notFound' },
    ];
  });
}
