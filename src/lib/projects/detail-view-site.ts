/**
 * Site-only view builders for project detail pages. Uses the dictionaries (and sits next to the
 * astro:i18n card builder), so scripts/ (Node type stripping) must never import this file.
 */
import type { Locale } from '../../i18n/config';
import { interpolate, useTranslations } from '../../i18n/t';
import type { ToolIconKey } from '../content/icons';
import type { ToolEntry } from '../content/home';
import { toCardView } from './card-view';
import { collectionItemSizes, collectionRows, injectNewTabHint, moduleWidths } from './detail-view';
import { EMBED_PROVIDERS } from './embeds';
import type {
  CategoryId,
  CollectionItemView,
  ModuleView,
  Project,
  ProjectDetailView,
  SourceImage,
  TeaserView,
} from './model';

function ratioOf(image: SourceImage): number {
  return Math.round((image.image.width / image.image.height) * 10_000) / 10_000;
}

/**
 * Localized, render-ready modules. Images are numbered across image modules and collection
 * components in DOM order; only the first is eager. Alt is the curated moduleAlt or the numbered
 * fallback, never Behance's auto alt (D-09). Zero modules render one unknown note.
 */
export function toModuleViews(project: Project, locale: Locale, title: string): ModuleView[] {
  const t = useTranslations(locale);
  const total = project.modules.reduce((count, module) => {
    if (module.kind === 'image') return count + 1;
    if (module.kind === 'collection') return count + module.images.length;
    return count;
  }, 0);
  let n = 0;
  const next = (image: SourceImage): { alt: string; eager: boolean } => {
    n += 1;
    const alt =
      project.moduleAlt[image.id]?.[locale] ??
      interpolate(t('detail.imageAlt'), { title, n, total });
    return { alt, eager: n === 1 };
  };
  const contentLang = project.contentLang === locale ? null : project.contentLang;
  // Side entrance (07 D-11a). Only ImageModules enter from a side. The count covers eligible
  // images only, in DOM order, starting at left, and never resets after a collection, text or
  // embed, so two neighbouring moving images never enter from the same side. Collection cells
  // drift instead (07-14, Q5): same opt-out set, but they never count toward the alternation.
  const optedOut = project.stackMotion === false ? null : new Set(project.stackMotion);
  let moving = 0;
  const entranceOf = (image: SourceImage, eager: boolean): 'left' | 'right' | null => {
    if (eager || optedOut === null || optedOut.has(image.id)) return null;
    moving += 1;
    return moving % 2 === 1 ? 'left' : 'right';
  };

  const views = project.modules.map((module): ModuleView => {
    switch (module.kind) {
      case 'image': {
        const { alt, eager } = next(module.image);
        return {
          kind: 'image',
          image: module.image.image,
          alt,
          widths: moduleWidths(module.image.image.width),
          fullBleed: module.fullBleed,
          caption: module.caption === '' ? null : module.caption,
          captionLang: module.caption === '' ? null : contentLang,
          eager,
          entrance: entranceOf(module.image, eager),
        };
      }
      case 'collection': {
        const rows: CollectionItemView[][] = [];
        let start = 0;
        for (const length of collectionRows(module.images.length)) {
          const row = module.images.slice(start, start + length);
          start += length;
          const sum = row.reduce((total, image) => total + ratioOf(image), 0);
          rows.push(
            row.map((image) => {
              const ratio = ratioOf(image);
              const { alt, eager } = next(image);
              return {
                image: image.image,
                alt,
                ratio,
                widths: moduleWidths(image.image.width),
                sizes: collectionItemSizes(ratio / sum),
                eager,
                drift: !eager && optedOut !== null && !optedOut.has(image.id),
              };
            }),
          );
        }
        return { kind: 'collection', rows };
      }
      case 'text':
        return {
          kind: 'text',
          // Render-time hint (RESEARCH Open Question 2): the snapshot stores no token.
          html: injectNewTabHint(module.html, t('a11y.newTab'), locale),
          lang: contentLang,
        };
      case 'embed': {
        const providerName = EMBED_PROVIDERS[module.provider].name;
        return {
          kind: 'embed',
          provider: module.provider,
          providerName,
          src: module.src,
          iframeTitle: interpolate(t('detail.embed.iframeTitle'), {
            title,
            provider: providerName,
          }),
        };
      }
      case 'unknown':
        return { kind: 'unknown' };
    }
  });
  return views.length > 0 ? views : [{ kind: 'unknown' }];
}

/** Tool name → icon key. Behance tool titles match tools.json names exactly (D-12). */
export function buildToolIcons(entries: readonly ToolEntry[]): ReadonlyMap<string, ToolIconKey> {
  return new Map(entries.map((entry) => [entry.data.name, entry.data.icon]));
}

/** Teaser fields of a neighbour, localized through the card builder (one localization path). */
function toTeaserView(
  project: Project | null,
  locale: Locale,
  categoryTitles: Readonly<Record<CategoryId, string>>,
): TeaserView | null {
  if (project === null) return null;
  const { slug, href, title, titleLang, cover, coverAlt } = toCardView(
    project,
    locale,
    categoryTitles,
  );
  return { slug, href, title, titleLang, cover, coverAlt };
}

export function toDetailView(
  project: Project,
  locale: Locale,
  categoryTitles: Readonly<Record<CategoryId, string>>,
  toolIcons: ReadonlyMap<string, ToolIconKey>,
  neighbours: { next: Project | null; previous: Project | null },
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
    next: toTeaserView(neighbours.next, locale, categoryTitles),
    previous: toTeaserView(neighbours.previous, locale, categoryTitles),
    modules: toModuleViews(project, locale, title),
  };
}
