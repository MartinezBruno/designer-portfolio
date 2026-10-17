// The only Behance-aware module on the site side (DATA-06). It reads the committed snapshot,
// validates it at module scope (any violation fails the build) and resolves covers from local
// files only, so no remote URL reaches astro:assets.
import type { ImageMetadata } from 'astro';
import raw from '../../../data/behance/snapshot.json';
import type { SourceImage, SourceModule, SourceProject } from '../model';
import {
  contentImageIds,
  parseSnapshot,
  type ContentEntry,
  type ImageRef,
  type Snapshot,
} from '../snapshot-schema';

const snapshot = parseSnapshot(raw);

const covers = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/projects/*.{png,jpg,jpeg,webp}',
  { eager: true },
);

function coverFor(file: string): ImageMetadata {
  const cover = covers[`/src/assets/projects/${file}`];
  if (cover === undefined) {
    throw new Error(
      `snapshot: missing cover file ${file} in src/assets/projects/. Re-run pnpm sync:behance or restore it from git`,
    );
  }
  return cover.default;
}

const moduleImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/projects/modules/*.webp',
  { eager: true },
);

function moduleImageFor(file: string): ImageMetadata {
  const image = moduleImages[`/src/assets/projects/modules/${file}`];
  if (image === undefined) {
    throw new Error(
      `snapshot: missing module image ${file} in src/assets/projects/modules/. Re-run pnpm sync:behance or restore it from git`,
    );
  }
  return image.default;
}

// Intrinsic dimensions come from the stored file's ImageMetadata (D-06); 04-08 tests that the
// snapshot width/height equal the files.
function toSourceImage(ref: ImageRef): SourceImage {
  return { id: ref.id, image: moduleImageFor(ref.file) };
}

function toSourceModule(entry: ContentEntry): SourceModule {
  switch (entry.kind) {
    case 'image':
      return {
        kind: 'image',
        image: toSourceImage(entry.image),
        fullBleed: entry.fullBleed,
        caption: entry.caption,
      };
    case 'collection':
      return { kind: 'collection', images: entry.images.map(toSourceImage) };
    case 'text':
      return { kind: 'text', html: entry.html };
    case 'embed':
      return { kind: 'embed', provider: entry.provider, src: entry.src };
    case 'unknown':
      return { kind: 'unknown' };
  }
}

const sourceProjects: readonly SourceProject[] = snapshot.projects.map((project) => ({
  id: project.id,
  sourceSlug: project.slug,
  sourceTitle: project.name,
  sourceUrl: project.url,
  publishedOn: project.publishedOn,
  tools: project.tools.map((tool) => tool.title),
  cover: coverFor(project.cover.file),
  imageIds: contentImageIds(project.content),
  modules: project.content.map(toSourceModule),
}));

export function getSourceProjects(): readonly SourceProject[] {
  return sourceProjects;
}

export function getSnapshotOrigin(): Snapshot['origin'] {
  return snapshot.origin;
}
