// Expected Projects page contents, derived from the committed snapshot and overrides (not a spec
// file, so Playwright does not collect it). Reuses the site's Node-safe ordering and selection
// rules so the expectations cannot drift from the build.
import overridesRaw from '../../../src/data/project-overrides.json' with { type: 'json' };
import services from '../../../src/data/services.json' with { type: 'json' };
import snapshot from '../../../src/data/behance/snapshot.json' with { type: 'json' };
import tools from '../../../src/data/tools.json' with { type: 'json' };
import { neighbours } from '../../../src/lib/projects/detail-view.ts';
import { parseOverrides } from '../../../src/lib/projects/overrides-schema.ts';
import { selectHomeProjects, sortProjects } from '../../../src/lib/projects/projects.ts';
import { toSlug } from '../../../src/lib/projects/slug.ts';

type Locale = 'en' | 'es';

export interface ExpectedProject {
  id: string;
  slug: string;
  href: string;
  publishedOn: number;
  order: number | null;
  featured: boolean;
  hidden: boolean;
  title: string;
  titleLang: Locale | null;
  category: string | null;
  summary: string | null;
  coverAlt: string | null;
}

const overrides = parseOverrides(overridesRaw);

function categoryLabel(id: string | undefined, locale: Locale): string | null {
  if (id === undefined) return null;
  return services.find((service) => service.id === id)?.title[locale] ?? null;
}

function rows(locale: Locale): ExpectedProject[] {
  return snapshot.projects.map((project) => {
    const override = overrides[project.id] ?? {};
    const slug = override.slug ?? toSlug(project.slug);
    const contentLang = override.contentLang ?? 'es';
    return {
      id: project.id,
      slug,
      href: locale === 'en' ? `/projects/${slug}/` : `/es/projects/${slug}/`,
      publishedOn: project.publishedOn,
      order: override.order ?? null,
      featured: override.featured ?? false,
      hidden: override.hidden ?? false,
      title: override.title?.[locale] ?? project.name,
      // An override title is written per locale; a fallback keeps its source language (D-10).
      titleLang: override.title !== undefined || contentLang === locale ? null : contentLang,
      category: categoryLabel(override.category, locale),
      summary: override.summary?.[locale] ?? null,
      coverAlt: override.coverAlt?.[locale] ?? null,
    };
  });
}

export function expectedProjects(locale: Locale): ExpectedProject[] {
  return sortProjects(rows(locale));
}

export function expectedHome(locale: Locale): ExpectedProject[] {
  return selectHomeProjects(rows(locale), 3);
}

export interface ExpectedDetail {
  slug: string;
  href: string;
  title: string;
  titleLang: Locale | null;
  summary: string | null;
  category: string | null;
  tools: readonly { name: string; hasIcon: boolean }[];
  behanceUrl: string;
  year: string;
  /** Cover file name without extension; astro:assets keeps it in the optimized file name. */
  coverStem: string;
  /** Wrapping neighbours in the `/projects` order (D-13), from the site's own helper. */
  next: { href: string; title: string } | null;
  previous: { href: string; title: string } | null;
}

function link(project: ExpectedProject | null): { href: string; title: string } | null {
  return project === null ? null : { href: project.href, title: project.title };
}

const toolNames = new Set(tools.map((tool) => tool.name));

/** Detail pages in `/projects` order (D-13), hidden projects excluded. */
export function expectedDetails(locale: Locale): ExpectedDetail[] {
  const sorted = expectedProjects(locale);
  return sorted.map((project) => {
    const pair = neighbours(sorted, project.slug);
    const source = snapshot.projects.find((entry) => entry.id === project.id);
    if (source === undefined) throw new Error(`helpers: no snapshot project ${project.id}`);
    return {
      slug: project.slug,
      href: project.href,
      title: project.title,
      titleLang: project.titleLang,
      summary: project.summary,
      category: project.category,
      tools: source.tools.map((tool) => ({ name: tool.title, hasIcon: toolNames.has(tool.title) })),
      behanceUrl: source.url,
      year: String(new Date(source.publishedOn * 1000).getUTCFullYear()),
      coverStem: source.cover.file.replace(/\.[a-z]+$/, ''),
      next: link(pair.next),
      previous: link(pair.previous),
    };
  });
}
