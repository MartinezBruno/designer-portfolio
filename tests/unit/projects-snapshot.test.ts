import { existsSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import seed from '../../src/data/behance/snapshot.json';
import services from '../../src/data/services.json';
import { categoryIds } from '../../src/lib/projects/model';
import {
  parseSnapshot,
  type Snapshot,
  type SnapshotProject,
} from '../../src/lib/projects/snapshot-schema';
import {
  getSnapshotOrigin,
  getSourceProjects,
} from '../../src/lib/projects/sources/behance-snapshot';

const KNOWN_IDS = [
  '238078789',
  '227934855',
  '226450035',
  '202447185',
  '185594991',
  '176799549',
  '172473551',
];

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

describe('seed snapshot', () => {
  const parsed = parseSnapshot(seed);

  it('parses with origin seed and the 7 known ids, newest first', () => {
    expect(parsed.origin).toBe('seed');
    expect(parsed.projects.map((project) => project.id)).toEqual(KNOWN_IDS);
  });

  it('keeps the Behance names verbatim', () => {
    expect(parsed.projects[0]?.name).toBe('Cabrera\u00b4s motos, Posts');
    expect(parsed.projects.map((project) => project.name)).toContain('Website "Reciclick"');
  });

  it('has every cover file on disk', () => {
    for (const project of parsed.projects) {
      expect(
        existsSync(new URL(`../../src/assets/projects/${project.cover.file}`, import.meta.url)),
      ).toBe(true);
    }
  });
});

describe('behance snapshot adapter', () => {
  it('returns 7 source projects with local covers that have dimensions', () => {
    const projects = getSourceProjects();
    expect(projects.map((project) => project.id)).toEqual(KNOWN_IDS);
    for (const project of projects) {
      expect(project.cover.width).toBeGreaterThan(0);
      expect(project.cover.height).toBeGreaterThan(0);
      expect(project.sourceUrl).toBe(
        `https://www.behance.net/gallery/${project.id}/${project.sourceSlug}`,
      );
    }
  });

  it('maps tools to titles in source order', () => {
    const titles = parseSnapshot(seed).projects.map((project) =>
      project.tools.map((tool) => tool.title),
    );
    expect(getSourceProjects().map((project) => [...project.tools])).toEqual(titles);
  });

  it('reports the seed origin', () => {
    expect(getSnapshotOrigin()).toBe('seed');
  });
});

describe('behance snapshot adapter failures', () => {
  const SNAPSHOT_MODULE = '../../src/data/behance/snapshot.json';
  const ADAPTER_MODULE = '../../src/lib/projects/sources/behance-snapshot';

  async function importWith(snapshot: object): Promise<void> {
    vi.resetModules();
    vi.doMock(SNAPSHOT_MODULE, () => ({ default: snapshot }));
    try {
      await import(ADAPTER_MODULE);
    } finally {
      vi.doUnmock(SNAPSHOT_MODULE);
      vi.resetModules();
    }
  }

  it('throws an actionable message when a cover file is missing', async () => {
    const project = validProject();
    const missing = {
      ...project,
      id: '999',
      cover: { ...project.cover, file: '999-000000000000.png' },
    };
    await expect(importWith({ ...validSnapshot(), projects: [missing] })).rejects.toThrow(
      `snapshot: missing cover file 999-000000000000.png in src/assets/projects/${SUFFIX.slice(1)}`,
    );
  });

  it('throws an actionable message when the snapshot is corrupt or empty', async () => {
    await expect(importWith({})).rejects.toThrow(PREFIX);
    await expect(importWith({})).rejects.toThrow(SUFFIX);
  });
});
