import { describe, expect, it } from 'vitest';
import services from '../../src/data/services.json';
import { categoryIds } from '../../src/lib/projects/model';
import {
  parseSnapshot,
  type Snapshot,
  type SnapshotProject,
} from '../../src/lib/projects/snapshot-schema';

const PREFIX = 'snapshot: invalid or missing src/data/behance/snapshot.json (';
const SUFFIX = '). Re-run pnpm sync:behance or restore it from git';

function validProject(): SnapshotProject {
  return {
    id: '172473551',
    slug: 'Mart',
    name: 'Mart',
    url: 'https://www.behance.net/gallery/172473551/Mart',
    publishedOn: 1686103564,
    modifiedOn: null,
    description: '',
    tags: [],
    tools: [{ id: 1, title: 'Figma' }],
    fields: [],
    canvasWidth: null,
    cover: {
      file: '172473551-0123456789ab.png',
      sourceUrl: 'https://www.behance.net/gallery/172473551/Mart',
      width: 808,
    },
    modules: [{ __typename: 'ImageModule', src: 'x' }],
  };
}

function validSnapshot(): Snapshot {
  return {
    version: 1,
    origin: 'seed',
    syncedAt: '2026-10-17T00:00:00.000Z',
    profile: { username: 'martifernand7', url: 'https://www.behance.net/martifernand7' },
    projects: [validProject()],
  };
}

function expectInvalid(raw: object, path: string): void {
  let message = '';
  try {
    parseSnapshot(raw);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message.startsWith(PREFIX)).toBe(true);
  expect(message.endsWith(SUFFIX)).toBe(true);
  expect(message).toContain(`${path}: `);
}

describe('categoryIds', () => {
  it('equals the service ids in file order', () => {
    expect([...categoryIds]).toEqual(services.map((service) => service.id));
  });
});

describe('parseSnapshot', () => {
  it('accepts a valid snapshot and keeps module JSON', () => {
    const parsed = parseSnapshot(validSnapshot());
    expect(parsed.projects[0]?.modules[0]).toEqual({ __typename: 'ImageModule', src: 'x' });
  });

  it('rejects an empty project list', () => {
    expectInvalid({ ...validSnapshot(), projects: [] }, 'projects');
  });

  it('rejects a project missing its name', () => {
    const project: Partial<SnapshotProject> = validProject();
    delete project.name;
    expectInvalid({ ...validSnapshot(), projects: [project] }, 'projects.0.name');
  });

  it('rejects an id that is not digits', () => {
    expectInvalid(
      { ...validSnapshot(), projects: [{ ...validProject(), id: '12a' }] },
      'projects.0.id',
    );
  });

  it.each(['../../etc/passwd', '172473551-xyz.png', '172473551-0123456789ab.svg'])(
    'rejects cover file %j',
    (file) => {
      const project = validProject();
      expectInvalid(
        { ...validSnapshot(), projects: [{ ...project, cover: { ...project.cover, file } }] },
        'projects.0.cover.file',
      );
    },
  );

  it('rejects an unknown origin', () => {
    expectInvalid({ ...validSnapshot(), origin: 'manual' }, 'origin');
  });
});
