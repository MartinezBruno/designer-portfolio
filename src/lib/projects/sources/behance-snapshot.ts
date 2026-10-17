// The only Behance-aware module on the site side (DATA-06). It reads the committed snapshot,
// validates it at module scope (any violation fails the build) and resolves covers from local
// files only, so no remote URL reaches astro:assets.
import type { ImageMetadata } from 'astro';
import raw from '../../../data/behance/snapshot.json';
import type { SourceProject } from '../model';
import { contentImageIds, parseSnapshot, type Snapshot } from '../snapshot-schema';

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

const sourceProjects: readonly SourceProject[] = snapshot.projects.map((project) => ({
  id: project.id,
  sourceSlug: project.slug,
  sourceTitle: project.name,
  sourceUrl: project.url,
  publishedOn: project.publishedOn,
  tools: project.tools.map((tool) => tool.title),
  cover: coverFor(project.cover.file),
  // `?? []` only until 04-08 makes content required.
  imageIds: contentImageIds(project.content),
}));

export function getSourceProjects(): readonly SourceProject[] {
  return sourceProjects;
}

export function getSnapshotOrigin(): Snapshot['origin'] {
  return snapshot.origin;
}
