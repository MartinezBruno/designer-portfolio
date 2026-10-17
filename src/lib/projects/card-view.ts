/**
 * Site-only view builders for project cards. Uses astro:i18n and the dictionaries, so
 * scripts/ (Node type stripping) must never import this file; they use projects.ts instead.
 */
import { getRelativeLocaleUrl } from 'astro:i18n';
import type { Locale } from '../../i18n/config';
import { interpolate, useTranslations } from '../../i18n/t';
import type { ServiceEntry } from '../content/home';
import { categoryIds, type CategoryId, type Project, type ProjectCardView } from './model';

export function toCardView(
  project: Project,
  locale: Locale,
  categoryTitles: Readonly<Record<CategoryId, string>>,
): ProjectCardView {
  const t = useTranslations(locale);
  const title = project.title?.[locale] ?? project.sourceTitle;
  return {
    slug: project.slug,
    href: getRelativeLocaleUrl(locale, `projects/${project.slug}`),
    title,
    // An override is written per locale; a fallback title keeps its source language (D-10).
    titleLang:
      project.title !== null || project.contentLang === locale ? null : project.contentLang,
    category: project.category === null ? null : categoryTitles[project.category],
    tools: [...project.tools],
    summary: project.summary?.[locale] ?? null,
    cover: project.cover,
    // Never Behance's auto alt text (D-15).
    coverAlt: project.coverAlt?.[locale] ?? interpolate(t('projects.coverAlt'), { title }),
  };
}

/** Category labels are the localized service titles (D-12). Throws on a missing service. */
export function buildCategoryTitles(
  entries: readonly ServiceEntry[],
  locale: Locale,
): Record<CategoryId, string> {
  const titles = new Map(entries.map((entry) => [entry.id, entry.data.title[locale]]));
  const missing = categoryIds.filter((id) => !titles.has(id));
  if (missing.length > 0) {
    throw new Error(
      `projects: services.json is missing category ids ${missing.join(', ')}. Fix src/data/services.json`,
    );
  }
  const result = {} as Record<CategoryId, string>;
  for (const id of categoryIds) result[id] = titles.get(id) ?? id;
  return result;
}
