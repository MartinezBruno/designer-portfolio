import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coverFileName, pickCover, sniffImage } from '../../scripts/behance/covers.ts';
import { SyncError } from '../../scripts/behance/errors.ts';
import {
  deriveFields,
  extractStore,
  keywordsMeta,
  parseProfileStore,
  parseProjectStore,
  suggestCategory,
} from '../../scripts/behance/parse.ts';
import type { RawCover } from '../../scripts/behance/raw-schemas.ts';

const fixture = (name: string): Buffer =>
  readFileSync(new URL(`../fixtures/behance/${name}`, import.meta.url));
const fixtureText = (name: string): string => fixture(name).toString('utf8');

const profileHtml = fixtureText('profile.html');
const projectHtml = fixtureText('project.html');
const challengeHtml = fixtureText('challenge.html');

const STORE_SCRIPT = /(<script[^>]*id="beconfig-store_state"[^>]*>)([\s\S]*?)(<\/script>)/;

/** Rewrites the store JSON inside a fixture so each test can build its own broken variant. */
function withStore(html: string, edit: (store: StoreShape) => void): string {
  const store = JSON.parse(extractStore(html)) as StoreShape;
  edit(store);
  return html.replace(STORE_SCRIPT, (_m, open: string, _json: string, close: string) => {
    return `${open}${JSON.stringify(store)}${close}`;
  });
}

interface StoreShape {
  profile: {
    activeSection: {
      work: { profileProjects: Record<string, string | number>[]; hasMore: boolean };
    };
  };
}

function expectSyncError(run: () => void, gate: string, text: string | RegExp): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(SyncError);
    if (error instanceof SyncError) {
      expect(error.gate).toBe(gate);
      expect(error.name).toBe('SyncError');
      expect(error.message).toMatch(text);
    }
    return;
  }
  throw new Error('expected a SyncError');
}

function profileCovers(): RawCover[] {
  const parsed = parseProfileStore(profileHtml);
  const first = parsed.projects.find((project) => project.id === '1001');
  if (first === undefined) throw new Error('fixture project 1001 missing');
  return first.covers;
}

describe('extractStore', () => {
  it('returns the JSON text of the beconfig-store_state island', () => {
    const text = extractStore(profileHtml);
    expect(text.startsWith('{')).toBe(true);
    expect(text).toContain('profileProjects');
  });

  it('throws gate G1 on a page without the store (challenge page)', () => {
    expectSyncError(() => extractStore(challengeHtml), 'G1', /no beconfig-store_state/);
  });
});

describe('parseProfileStore', () => {
  it('returns the 3 fixture projects with string ids and hasMore false', () => {
    const parsed = parseProfileStore(profileHtml);
    expect(parsed.hasMore).toBe(false);
    expect(parsed.projects.map((project) => project.id)).toEqual(['1001', '1002', '1003']);
    const first = parsed.projects[0];
    expect(first?.slug).toBe('project-1');
    expect(first?.url).toBe('https://www.behance.net/gallery/1001/project-1');
    expect(first?.covers).toHaveLength(14);
  });

  it('fails on hasMore true, pointing at pagination and plan B', () => {
    const html = withStore(profileHtml, (store) => {
      store.profile.activeSection.work.hasMore = true;
    });
    expectSyncError(() => parseProfileStore(html), 'G1', /pagination.*plan B/);
  });

  it('fails on an empty project list', () => {
    const html = withStore(profileHtml, (store) => {
      store.profile.activeSection.work.profileProjects = [];
    });
    expectSyncError(() => parseProfileStore(html), 'G1', /expected at least 1 project, got 0/);
  });

  it('fails with the Zod path when a project has no name', () => {
    const html = withStore(profileHtml, (store) => {
      const first = store.profile.activeSection.work.profileProjects[0];
      if (first !== undefined) delete first['name'];
    });
    expectSyncError(() => parseProfileStore(html), 'G1', /profileProjects\.0\.name/);
  });

  it('fails when the store JSON does not parse', () => {
    const html = profileHtml.replace(STORE_SCRIPT, '$1{not json$3');
    expectSyncError(() => parseProfileStore(html), 'G1', /JSON/);
  });
});

describe('parseProjectStore', () => {
  it('returns the validated project with tools, tags and every module kept as-is', () => {
    const project = parseProjectStore(projectHtml, '1001');
    expect(project.id).toBe('1001');
    expect(project.tools).toEqual([{ id: '21', title: 'Adobe Photoshop' }]);
    expect(project.tags).toEqual([
      { id: '11', title: 'tag a ' },
      { id: '12', title: 'tag b' },
    ]);
    expect(project.allModules).toHaveLength(2);
    expect(project.allModules.map((module) => module.__typename)).toEqual([
      'ImageModule',
      'FutureModule',
    ]);
    expect(project.canvasWidth).toBe(1400);
  });

  it('throws gate G3 on an id mismatch', () => {
    expectSyncError(() => parseProjectStore(projectHtml, '9999'), 'G3', /id mismatch/);
  });

  it('throws gate G3 when the project page has no store', () => {
    expectSyncError(() => parseProjectStore(challengeHtml, '1001'), 'G3', /beconfig-store_state/);
  });
});

describe('keywordsMeta and deriveFields', () => {
  it('splits the keywords meta on commas and trims', () => {
    expect(keywordsMeta(projectHtml)).toEqual([
      'Adobe Photoshop',
      'tag a',
      'tag b',
      'Graphic Design',
    ]);
  });

  it('returns an empty list when the meta is missing', () => {
    expect(keywordsMeta(challengeHtml)).toEqual([]);
  });

  it('drops tools + tags leading items and keeps the creative fields', () => {
    expect(
      deriveFields(['Photoshop', 'tag a ', 'tag b', 'Graphic Design', 'Web Design'], 1, 2),
    ).toEqual(['Graphic Design', 'Web Design']);
  });

  it('derives the fixture field from the project page', () => {
    const project = parseProjectStore(projectHtml, '1001');
    expect(
      deriveFields(keywordsMeta(projectHtml), project.tools.length, project.tags.length),
    ).toEqual(['Graphic Design']);
  });
});

describe('pickCover', () => {
  it('picks the non-WEBP max_808 entry from the 14-entry list', () => {
    const picked = pickCover(profileCovers());
    expect(picked.type).toBe('JPG');
    expect(new URL(picked.url).pathname).toContain('/projects/max_808/');
  });

  it('falls back to the largest finite-width non-WEBP entry', () => {
    const covers = profileCovers().filter((cover) => !cover.url.includes('/projects/max_808/'));
    const picked = pickCover(covers);
    expect(picked.type).toBe('JPG');
    expect(picked.width).toBe(808);
    expect(new URL(picked.url).pathname).toContain('/projects/808/');
  });

  it('throws gate G4 when only WEBP or null-width entries exist', () => {
    const covers = profileCovers().filter((cover) => cover.type === 'WEBP' || cover.width === null);
    expectSyncError(() => pickCover(covers), 'G4', /no usable cover/);
  });
});

describe('sniffImage', () => {
  it.each([
    ['png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]],
    ['jpg', [0xff, 0xd8, 0xff, 0xe0, 0x00]],
    ['webp', [...Buffer.from('RIFF'), 0x10, 0x00, 0x00, 0x00, ...Buffer.from('WEBPVP8 ')]],
  ] as const)('detects %s by magic bytes', (ext, bytes) => {
    expect(sniffImage(Uint8Array.from(bytes))).toBe(ext);
  });

  it('detects the PNG fixture', () => {
    expect(sniffImage(new Uint8Array(fixture('cover.png')))).toBe('png');
  });

  it('returns null for non-image bytes', () => {
    expect(sniffImage(new Uint8Array(fixture('not-image.bin')))).toBeNull();
    expect(sniffImage(new Uint8Array(0))).toBeNull();
  });
});

describe('coverFileName', () => {
  const bytes = new Uint8Array(fixture('cover.png'));

  it('builds <id>-<sha256 first 12>.<ext> and is stable for identical bytes', () => {
    const name = coverFileName('1001', bytes, 'png');
    expect(name).toMatch(/^1001-[0-9a-f]{12}\.png$/);
    expect(coverFileName('1001', new Uint8Array(bytes), 'png')).toBe(name);
  });

  it.each(['../etc', '1001a', '', 'project-1'])('rejects the non-digit id %j', (id) => {
    expect(() => coverFileName(id, bytes, 'png')).toThrow(SyncError);
  });
});

describe('suggestCategory', () => {
  it.each([
    [['Graphic Design'], 'graphic-design'],
    [['Web Design'], 'web-design'],
    [['Interaction Design'], 'web-design'],
    [['UI/UX'], 'web-design'],
    [['Branding'], 'branding'],
    [['Visual Identity'], 'branding'],
    [['Advertising'], 'social-media'],
    [['Social Media'], 'social-media'],
  ])('maps %j to %s', (fields, expected) => {
    expect(suggestCategory(fields)).toBe(expected);
  });

  it('returns null when no field maps to a category', () => {
    expect(suggestCategory(['Illustration'])).toBeNull();
    expect(suggestCategory([])).toBeNull();
    expect(suggestCategory(['constructor'])).toBeNull();
  });

  it('lets the first matching field win, in field order', () => {
    expect(suggestCategory(['Illustration', 'Web Design', 'Graphic Design'])).toBe('web-design');
    expect(suggestCategory(['Branding', 'Web Design'])).toBe('branding');
  });

  it('is case-insensitive and trims', () => {
    expect(suggestCategory(['  graphic DESIGN '])).toBe('graphic-design');
  });
});
