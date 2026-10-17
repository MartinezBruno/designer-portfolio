import { existsSync, readdirSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { sanitizeText } from '../../scripts/behance/sanitize.ts';
import committed from '../../src/data/behance/snapshot.json';
import services from '../../src/data/services.json';
import { providerForUrl } from '../../src/lib/projects/embeds';
import { categoryIds } from '../../src/lib/projects/model';
import {
  MODULE_FILE,
  parseSnapshot,
  type ContentEntry,
  type ImageRef,
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
      sourceUrl: 'https://mir-s3-cdn-cf.behance.net/projects/max_808/172473551.png',
      width: 808,
    },
    modules: [{ __typename: 'ImageModule', src: 'x' }],
    content: [],
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

  it('rejects a duplicate project id, even with another slug', () => {
    expectInvalid(
      { ...validSnapshot(), projects: [validProject(), { ...validProject(), slug: 'Other' }] },
      'projects.1.id',
    );
  });

  it('rejects an unknown origin', () => {
    expectInvalid({ ...validSnapshot(), origin: 'manual' }, 'origin');
  });

  const UNSAFE_URLS = [
    'javascript:alert(1)',
    'data:text/html,x',
    'file:///etc/passwd',
    'http://www.behance.net/gallery/172473551/Mart',
    'https://evil.example/gallery/172473551/Mart',
    'https://www.behance.net.evil.example/gallery/172473551/Mart',
    'https://user:pass@www.behance.net/gallery/172473551/Mart',
  ];

  it.each(UNSAFE_URLS)('rejects project url %j', (url) => {
    expectInvalid({ ...validSnapshot(), projects: [{ ...validProject(), url }] }, 'projects.0.url');
  });

  it.each(UNSAFE_URLS)('rejects profile url %j', (url) => {
    const snapshot = validSnapshot();
    expectInvalid({ ...snapshot, profile: { ...snapshot.profile, url } }, 'profile.url');
  });

  it.each([
    ...UNSAFE_URLS,
    'https://mir-cdn.behance.net/x.png',
    'https://www.behance.net/x.png',
    'https://user@mir-s3-cdn-cf.behance.net/x.png',
  ])('rejects cover sourceUrl %j', (sourceUrl) => {
    const project = validProject();
    expectInvalid(
      { ...validSnapshot(), projects: [{ ...project, cover: { ...project.cover, sourceUrl } }] },
      'projects.0.cover.sourceUrl',
    );
  });
});

describe('committed snapshot', () => {
  const parsed = parseSnapshot(committed);

  it('parses with origin behance-sync and the 7 known ids, newest first', () => {
    expect(parsed.origin).toBe('behance-sync');
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

function imageRefs(content: readonly ContentEntry[]): ImageRef[] {
  return content.flatMap((entry) => {
    if (entry.kind === 'image') return [entry.image];
    if (entry.kind === 'collection') return entry.images;
    return [];
  });
}

const MODULES_DIR = new URL('../../src/assets/projects/modules/', import.meta.url);

describe('committed snapshot content (04-08 invariants)', () => {
  const projects = parseSnapshot(committed).projects;

  it('gives every project a non-empty content array', () => {
    for (const project of projects) expect(project.content.length).toBeGreaterThan(0);
  });

  it('stores every text entry as a sanitizer fixed point without inline design styles', () => {
    for (const project of projects) {
      for (const entry of project.content) {
        if (entry.kind !== 'text') continue;
        expect(sanitizeText(entry.html)).toBe(entry.html);
        expect(entry.html).not.toMatch(/color|font-family|font-size/i);
        for (const [, style] of entry.html.matchAll(/style="([^"]*)"/g)) {
          expect(style).toMatch(/^text-align:\s*(left|right|center|justify);?$/);
        }
      }
    }
  });

  it('only stores allowlisted embed srcs', () => {
    for (const project of projects) {
      for (const entry of project.content) {
        if (entry.kind === 'embed') expect(providerForUrl(entry.src)).toBe(entry.provider);
      }
    }
  });

  it('keeps image ref ids unique within each project', () => {
    for (const project of projects) {
      const ids = imageRefs(project.content).map((ref) => ref.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has every content image on disk as a WebP of its real pixel size', async () => {
    for (const project of projects) {
      for (const ref of imageRefs(project.content)) {
        const file = new URL(ref.file, MODULES_DIR);
        expect(existsSync(file), ref.file).toBe(true);
        const meta = await sharp(file.pathname).metadata();
        expect(meta.format, ref.file).toBe('webp');
        expect(meta.width, ref.file).toBe(ref.width);
        expect(meta.height, ref.file).toBe(ref.height);
        expect(ref.width).toBeLessThanOrEqual(1400);
      }
    }
  });

  it('has no orphan module image files', () => {
    const referenced = new Set(
      projects.flatMap((project) => imageRefs(project.content).map((ref) => ref.file)),
    );
    const onDisk = readdirSync(MODULES_DIR).filter((name) => MODULE_FILE.test(name));
    expect(onDisk.length).toBeGreaterThan(0);
    for (const name of onDisk) expect(referenced.has(name), name).toBe(true);
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
    const titles = parseSnapshot(committed).projects.map((project) =>
      project.tools.map((tool) => tool.title),
    );
    expect(getSourceProjects().map((project) => [...project.tools])).toEqual(titles);
  });

  it('maps content to source modules with local images whose dimensions match the snapshot', () => {
    const snapshotProjects = parseSnapshot(committed).projects;
    for (const [index, project] of getSourceProjects().entries()) {
      const content = snapshotProjects[index]?.content ?? [];
      expect(project.modules.map((module) => module.kind)).toEqual(
        content.map((entry) => entry.kind),
      );
      const refs = content.flatMap((entry): ImageRef[] => {
        if (entry.kind === 'image') return [entry.image];
        if (entry.kind === 'collection') return entry.images;
        return [];
      });
      const images = project.modules.flatMap((module) => {
        if (module.kind === 'image') return [module.image];
        if (module.kind === 'collection') return [...module.images];
        return [];
      });
      expect(images.map((image) => image.id)).toEqual(refs.map((ref) => ref.id));
      for (const [position, image] of images.entries()) {
        expect(image.image.width).toBe(refs[position]?.width);
        expect(image.image.height).toBe(refs[position]?.height);
        expect(image.image.src).not.toContain('behance.net');
      }
      for (const module of project.modules) expect(module).not.toHaveProperty('type');
    }
  });

  it('reports the behance-sync origin', () => {
    expect(getSnapshotOrigin()).toBe('behance-sync');
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

  it('throws an actionable message when a module image file is missing', async () => {
    const real = parseSnapshot(committed).projects[0];
    if (real === undefined) throw new Error('committed snapshot has no projects');
    const missing: SnapshotProject = {
      ...real,
      content: [
        {
          kind: 'image',
          image: {
            id: '1',
            file: '999-000000000000.webp',
            width: 1400,
            height: 700,
            sourceUrl: 'https://mir-s3-cdn-cf.behance.net/project_modules/1400/999.png',
          },
          fullBleed: true,
          caption: '',
        },
      ],
    };
    await expect(importWith({ ...validSnapshot(), projects: [missing] })).rejects.toThrow(
      `snapshot: missing module image 999-000000000000.webp in src/assets/projects/modules/${SUFFIX.slice(1)}`,
    );
  });

  it('throws an actionable message when the snapshot is corrupt or empty', async () => {
    await expect(importWith({})).rejects.toThrow(PREFIX);
    await expect(importWith({})).rejects.toThrow(SUFFIX);
  });
});
