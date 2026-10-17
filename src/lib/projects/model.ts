// Source-agnostic project model (DATA-06). UI imports these types, never the Behance adapter.
// Erasable TypeScript only (type imports and a const tuple), so Node type stripping loads it.
import type { ImageMetadata } from 'astro';
import type { Locale } from '../../i18n/config.ts';

/** Curated categories. Same ids, same order as src/data/services.json. */
export const categoryIds = ['graphic-design', 'web-design', 'branding', 'social-media'] as const;

export type CategoryId = (typeof categoryIds)[number];

export type Localized<T> = Record<Locale, T>;

export interface OrderFields {
  id: string;
  publishedOn: number;
  order: number | null;
  featured: boolean;
  hidden: boolean;
}

/** What any source (snapshot, manual content) must provide for a project. */
export interface SourceProject {
  id: string;
  sourceSlug: string;
  sourceTitle: string;
  sourceUrl: string;
  /** Unix seconds. */
  publishedOn: number;
  tools: readonly string[];
  cover: ImageMetadata;
}

export interface Project extends SourceProject, OrderFields {
  slug: string;
  title: Localized<string> | null;
  summary: Localized<string> | null;
  coverAlt: Localized<string> | null;
  category: CategoryId | null;
  contentLang: Locale;
}

export interface ProjectCardView {
  slug: string;
  href: string;
  title: string;
  titleLang: Locale | null;
  category: string | null;
  tools: readonly string[];
  summary: string | null;
  cover: ImageMetadata;
  coverAlt: string;
}
