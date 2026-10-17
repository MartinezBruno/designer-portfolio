// Expected Projects page contents, derived from the committed snapshot and overrides (not a spec
// file, so Playwright does not collect it). Reuses the site's Node-safe ordering and selection
// rules so the expectations cannot drift from the build.
import overridesRaw from '../../../src/data/project-overrides.json' with { type: 'json' };
import services from '../../../src/data/services.json' with { type: 'json' };
import snapshot from '../../../src/data/behance/snapshot.json' with { type: 'json' };
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
    };
  });
}

export function expectedProjects(locale: Locale): ExpectedProject[] {
  return sortProjects(rows(locale));
}

export function expectedHome(locale: Locale): ExpectedProject[] {
  return selectHomeProjects(rows(locale), 3);
}
