/**
 * Site-only view builders for project detail pages. Uses the dictionaries (and sits next to the
 * astro:i18n card builder), so scripts/ (Node type stripping) must never import this file.
 */
import type { Locale } from '../../i18n/config';
import { interpolate, useTranslations } from '../../i18n/t';
import type { ToolIconKey } from '../content/icons';
import type { ToolEntry } from '../content/home';
import type { CategoryId, Project, ProjectDetailView } from './model';

/** Tool name → icon key. Behance tool titles match tools.json names exactly (D-12). */
export function buildToolIcons(entries: readonly ToolEntry[]): ReadonlyMap<string, ToolIconKey> {
  return new Map(entries.map((entry) => [entry.data.name, entry.data.icon]));
}

export function toDetailView(
  project: Project,
  locale: Locale,
  categoryTitles: Readonly<Record<CategoryId, string>>,
  toolIcons: ReadonlyMap<string, ToolIconKey>,
): ProjectDetailView {
  const t = useTranslations(locale);
  const title = project.title?.[locale] ?? project.sourceTitle;
  const summary = project.summary?.[locale] ?? null;
  return {
    slug: project.slug,
    title,
    // An override is written per locale; a fallback title keeps its source language (D-10).
    titleLang:
      project.title !== null || project.contentLang === locale ? null : project.contentLang,
    summary,
    category: project.category === null ? null : categoryTitles[project.category],
    tools: project.tools.map((name) => ({ name, icon: toolIcons.get(name) ?? null })),
    behanceUrl: project.sourceUrl,
    cover: project.cover,
    // Never Behance's auto alt text (D-15).
    coverAlt: project.coverAlt?.[locale] ?? interpolate(t('projects.coverAlt'), { title }),
    // No date in any SEO copy (D-12).
    seo: {
      title: interpolate(t('meta.project.title'), { title }),
      description: summary ?? interpolate(t('meta.project.description'), { title }),
    },
  };
}
