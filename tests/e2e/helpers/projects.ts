// Expected Projects page contents, derived from the committed snapshot (not a spec file, so
// Playwright does not collect it). Plan 03-04 extends this with the bilingual overrides.
import snapshot from '../../../src/data/behance/snapshot.json' with { type: 'json' };
import { toSlug } from '../../../src/lib/projects/slug.ts';

export interface ExpectedProject {
  id: string;
  slug: string;
  href: string;
  title: string;
  titleLang: 'es' | null;
}

export function expectedProjects(locale: 'en' | 'es'): ExpectedProject[] {
  return [...snapshot.projects]
    .sort((a, b) => b.publishedOn - a.publishedOn || a.id.localeCompare(b.id))
    .map((project) => {
      const slug = toSlug(project.slug);
      return {
        id: project.id,
        slug,
        href: locale === 'en' ? `/projects/${slug}/` : `/es/projects/${slug}/`,
        title: project.name,
        // No overrides yet: the Spanish Behance title is marked on the EN page only.
        titleLang: locale === 'en' ? 'es' : null,
      };
    });
}
