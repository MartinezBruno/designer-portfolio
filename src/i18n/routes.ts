import { getAbsoluteLocaleUrl, getRelativeLocaleUrl } from 'astro:i18n';
import type { Locale } from './config';

/** '/es/' -> '/', '/es/projects/' -> '/projects/', '/essay/' stays '/essay/'. */
export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/es(?=\/|$)/, '') || '/';
}

/** Equivalent path of `pathname` in `target` locale (relative URL). */
export function alternatePath(pathname: string, target: Locale): string {
  return getRelativeLocaleUrl(target, stripLocale(pathname));
}

/** Equivalent absolute URL of `pathname` in `target` locale (host from astro.config `site`). */
export function absoluteFor(pathname: string, target: Locale): string {
  return getAbsoluteLocaleUrl(target, stripLocale(pathname));
}
