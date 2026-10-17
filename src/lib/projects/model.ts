// Source-agnostic project model (DATA-06). UI imports these types, never the Behance adapter.
// Erasable TypeScript only (type imports and a const tuple), so Node type stripping loads it.
import type { ImageMetadata } from 'astro';
import type { Locale } from '../../i18n/config.ts';
import type { ToolIconKey } from '../content/icons.ts';
import type { EmbedProviderId } from './embeds.ts';

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

/** One locally stored content image. Intrinsic dimensions come from the file (D-06). */
export interface SourceImage {
  /** Module or collection component id: the moduleAlt override key. */
  id: string;
  image: ImageMetadata;
}

/** Source-agnostic content module, in source order (D-05, D-08). */
export type SourceModule =
  | { kind: 'image'; image: SourceImage; fullBleed: boolean; caption: string }
  | { kind: 'collection'; images: readonly SourceImage[] }
  | { kind: 'text'; html: string }
  | { kind: 'embed'; provider: EmbedProviderId; src: string }
  | { kind: 'unknown' };

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
  /** Content image ids in DOM order: the keys moduleAlt overrides may use (D-09). */
  imageIds: readonly string[];
  /** Content modules in source order. */
  modules: readonly SourceModule[];
}

export interface Project extends SourceProject, OrderFields {
  slug: string;
  title: Localized<string> | null;
  summary: Localized<string> | null;
  coverAlt: Localized<string> | null;
  category: CategoryId | null;
  contentLang: Locale;
  /** Curated per-image alt text keyed by image id (D-09). Empty when none is curated. */
  moduleAlt: Readonly<Record<string, Localized<string>>>;
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

/** The card fields the next-project teaser and the previous link need (D-14). */
export type TeaserView = Pick<
  ProjectCardView,
  'slug' | 'href' | 'title' | 'titleLang' | 'cover' | 'coverAlt'
>;

/** A tool on the detail page. `icon` is null when the Behance title matches no tools.json name. */
export interface DetailTool {
  name: string;
  icon: ToolIconKey | null;
}

/** One image of a justified collection row (D-10). */
export interface CollectionItemView {
  image: ImageMetadata;
  alt: string;
  /** width / height, 4 decimals: the flex-grow factor of the item. */
  ratio: number;
  widths: readonly number[];
  sizes: string;
  eager: boolean;
}

/** One localized, render-ready content module. No Behance shapes reach the UI (DATA-06). */
export type ModuleView =
  | {
      kind: 'image';
      image: ImageMetadata;
      alt: string;
      widths: readonly number[];
      fullBleed: boolean;
      caption: string | null;
      captionLang: Locale | null;
      eager: boolean;
    }
  | { kind: 'collection'; rows: readonly (readonly CollectionItemView[])[] }
  | { kind: 'text'; html: string; lang: Locale | null }
  | {
      kind: 'embed';
      provider: EmbedProviderId;
      providerName: string;
      src: string;
      iframeTitle: string;
    }
  | { kind: 'unknown' };

/** Resolved, already-localized detail page data. No optional properties; no date (D-12). */
export interface ProjectDetailView {
  slug: string;
  title: string;
  titleLang: Locale | null;
  summary: string | null;
  category: string | null;
  tools: readonly DetailTool[];
  behanceUrl: string;
  cover: ImageMetadata;
  coverAlt: string;
  seo: { title: string; description: string };
  /** Wrapping neighbours in the /projects order (D-13). Null with 1 project; previous null with 2. */
  next: TeaserView | null;
  previous: TeaserView | null;
  /** Content modules in source order; never empty (zero modules → one unknown note). */
  modules: readonly ModuleView[];
}
