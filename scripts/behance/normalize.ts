// Raw Behance data -> one SnapshotProject. Erasable TypeScript only (Node type stripping runs it).
//
// Keys are written in one fixed order so snapshot diffs stay reviewable (Pitfall 7). Identity and
// dates (id, slug, name, url, publishedOn, modifiedOn) come from the profile list, the canonical
// list the site mirrors; content (description, tags, tools, canvasWidth, modules) comes from the
// project page, and `content` is the normalized module list built by module-content.ts (written
// after `modules`). Module JSON is kept raw: auto-generated altText stays inside it and is never
// copied anywhere else (D-15: it is never rendered). The result is validated by SnapshotSchema
// (gate G5) before anything is committed.
import type { ContentEntry, SnapshotProject } from '../../src/lib/projects/snapshot-schema.ts';
import type { Label, ProfileProject, ProjectStore } from './parse.ts';

export interface CoverRef {
  file: string;
  sourceUrl: string;
  width: number | null;
}

// parse.ts normalises Behance label ids to strings; the snapshot stores them as integers.
// A non-numeric id becomes NaN and fails the schema (G5) instead of being guessed.
const toTaxonomy = (label: Label): { id: number; title: string } => ({
  id: Number(label.id),
  title: label.title,
});

export function toSnapshotProject(
  profile: ProfileProject,
  project: ProjectStore,
  fields: readonly string[],
  cover: CoverRef,
  content: readonly ContentEntry[],
): SnapshotProject {
  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
    url: profile.url,
    publishedOn: profile.publishedOn,
    modifiedOn: profile.modifiedOn ?? null,
    description: project.description,
    tags: project.tags.map(toTaxonomy),
    tools: project.tools.map(toTaxonomy),
    fields: [...fields],
    canvasWidth: project.canvasWidth ?? null,
    cover: { file: cover.file, sourceUrl: cover.sourceUrl, width: cover.width },
    modules: project.allModules,
    content: [...content],
  };
}
