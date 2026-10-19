import { describe, expect, it } from 'vitest';
import committed from '../../src/data/behance/snapshot.json';
import { SyncError } from '../../scripts/behance/errors';
import {
  IMAGE_VARIANTS,
  KNOWN_MODULES,
  planModuleImages,
  toContent,
  type ImagePlan,
} from '../../scripts/behance/module-content';
import type { RawModule } from '../../scripts/behance/raw-schemas';
import { EMBED_PROVIDERS, providerForUrl } from '../../src/lib/projects/embeds';
import {
  ContentSchema,
  contentImageIds,
  type ContentEntry,
  type ImageRef,
} from '../../src/lib/projects/snapshot-schema';

const CDN = 'https://mir-s3-cdn-cf.behance.net/project_modules/1400_webp/abc.png';
const FIGMA = 'https://embed.figma.com/proto/l6Tt6mne6t9K2TjqphmvRE/portfolio-bruno?node-id=457-78';

const projects = committed.projects.map((project) => ({
  id: project.id,
  slug: project.slug,
  modules: project.modules as RawModule[],
}));

const allModules: RawModule[] = projects.flatMap((project) => project.modules);

function imageMap(plans: readonly ImagePlan[]): Map<string, ImageRef> {
  return new Map(
    plans.map((plan) => [
      plan.id,
      {
        id: plan.id,
        file: `${plan.id}-000000000000.webp`,
        width: 1400,
        height: 1000,
        sourceUrl: plan.candidates[0] ?? CDN,
      },
    ]),
  );
}

function ref(id: string): ImageRef {
  return { id, file: `${id}-0123456789ab.webp`, width: 1400, height: 900, sourceUrl: CDN };
}

const variantOf = (url: string): string => new URL(url).pathname.split('/')[2] ?? '';

describe('providerForUrl', () => {
  it('accepts https embed.figma.com', () => {
    expect(providerForUrl('https://embed.figma.com/proto/x')).toBe('figma');
    expect(providerForUrl(FIGMA)).toBe('figma');
    expect(EMBED_PROVIDERS.figma.host).toBe('embed.figma.com');
  });

  it.each([
    'http://embed.figma.com/proto/x',
    'https://www.figma.com/proto/x',
    'https://evil.com/proto/x',
    'https://embed.figma.com.evil.com/proto/x',
    'https://user:pass@embed.figma.com/proto/x',
    'https://user@embed.figma.com/proto/x',
    'javascript:alert(1)',
    '//embed.figma.com/proto/x',
    'not a url',
    '',
  ])('rejects %s', (src) => {
    expect(providerForUrl(src)).toBeNull();
  });
});

describe('ContentSchema', () => {
  const valid: ContentEntry[] = [
    { kind: 'image', image: ref('1'), fullBleed: true, caption: '' },
    { kind: 'collection', images: [ref('2'), ref('3')] },
    { kind: 'text', html: '<p>Hi</p>' },
    { kind: 'embed', provider: 'figma', src: FIGMA },
    { kind: 'unknown', type: 'VideoModule' },
  ];

  it.each(valid)('accepts a valid $kind entry', (entry) => {
    expect(ContentSchema.safeParse(entry).success).toBe(true);
  });

  it.each([
    ['a non-digit id in the file name', { ...ref('1'), file: 'abc-0123456789ab.webp' }],
    ['a non-webp file', { ...ref('1'), file: '1-0123456789ab.png' }],
    ['a traversal file name', { ...ref('1'), file: '../1-0123456789ab.webp' }],
    ['a non-digit id', { ...ref('1'), id: '1a' }],
    ['width over 1400', { ...ref('1'), width: 1401 }],
    ['a source on another host', { ...ref('1'), sourceUrl: 'https://evil.com/a.webp' }],
    ['an extra key', { ...ref('1'), extra: true }],
  ])('rejects an image ref with %s', (_label, image) => {
    expect(
      ContentSchema.safeParse({ kind: 'image', image, fullBleed: false, caption: '' }).success,
    ).toBe(false);
  });

  it('rejects embeds on another host or protocol, and unknown providers', () => {
    for (const src of ['https://evil.com/x', 'http://embed.figma.com/x', 'javascript:alert(1)']) {
      expect(ContentSchema.safeParse({ kind: 'embed', provider: 'figma', src }).success).toBe(
        false,
      );
    }
    expect(
      ContentSchema.safeParse({ kind: 'embed', provider: 'youtube', src: FIGMA }).success,
    ).toBe(false);
  });

  it('rejects extra keys, empty collections and unknown kinds', () => {
    expect(ContentSchema.safeParse({ kind: 'text', html: '', extra: 1 }).success).toBe(false);
    expect(ContentSchema.safeParse({ kind: 'collection', images: [] }).success).toBe(false);
    expect(ContentSchema.safeParse({ kind: 'video', type: 'x' }).success).toBe(false);
  });

  it('contentImageIds returns ids in DOM order', () => {
    expect(contentImageIds(valid)).toEqual(['1', '2', '3']);
    expect(
      contentImageIds([
        { kind: 'collection', images: [ref('9'), ref('8')] },
        { kind: 'text', html: '' },
        { kind: 'image', image: ref('7'), fullBleed: false, caption: '' },
      ]),
    ).toEqual(['9', '8', '7']);
  });
});

describe('planModuleImages', () => {
  it('lists the known module types', () => {
    expect([...KNOWN_MODULES].sort()).toEqual([
      'EmbedModule',
      'ImageModule',
      'MediaCollectionModule',
      'TextModule',
    ]);
  });

  it('plans 154 images on the real snapshot', () => {
    const plans = projects.flatMap((project) => planModuleImages(project.modules));
    expect(plans).toHaveLength(154);
    expect(new Set(plans.map((plan) => plan.id)).size).toBe(154);
    for (const plan of plans) {
      expect(plan.id).toMatch(/^\d+$/);
      expect(plan.candidates.length).toBeGreaterThan(0);
      const order = plan.candidates.map((url) =>
        (IMAGE_VARIANTS as readonly string[]).indexOf(variantOf(url)),
      );
      expect(order.every((index) => index >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      expect(new Set(order).size).toBe(order.length);
      expect(variantOf(plan.candidates[0] ?? '')).toBe('1400_webp');
    }
  });

  it('keeps DOM order: each ImageModule, then each collection component', () => {
    const modules: RawModule[] = [
      { __typename: 'TextModule', id: 1, text: '<p>a</p>' },
      {
        __typename: 'MediaCollectionModule',
        id: 2,
        components: [
          { id: 21, imageSizes: { allAvailable: [{ url: CDN, width: 1400, type: 'WEBP' }] } },
          { id: '22', imageSizes: { allAvailable: [{ url: CDN, width: 1400, type: 'WEBP' }] } },
        ],
      },
      {
        __typename: 'ImageModule',
        id: 3,
        fullBleed: 1,
        caption: '',
        imageSizes: { allAvailable: [{ url: CDN, width: 1400, type: 'WEBP' }] },
      },
    ];
    expect(planModuleImages(modules).map((plan) => plan.id)).toEqual(['21', '22', '3']);
  });

  it('picks candidates by path segment, never by array position', () => {
    const base = 'https://mir-s3-cdn-cf.behance.net/project_modules';
    const modules: RawModule[] = [
      {
        __typename: 'ImageModule',
        id: 5,
        imageSizes: {
          allAvailable: [
            { url: `${base}/fs/a.png`, width: 1920, type: 'JPG' },
            { url: `${base}/max_1200_still/a.png`, width: 1200, type: 'JPG' },
            { url: `${base}/disp/a.png`, width: 600, type: 'JPG' },
            { url: `${base}/1400/a.png`, width: 1400, type: 'JPG' },
          ],
        },
      },
    ];
    expect(planModuleImages(modules)[0]?.candidates).toEqual([
      `${base}/1400/a.png`,
      `${base}/fs/a.png`,
    ]);
  });

  it('skips candidates off the allowlisted CDN host and falls through to the next one', () => {
    const base = 'https://mir-s3-cdn-cf.behance.net/project_modules';
    const modules: RawModule[] = [
      {
        __typename: 'ImageModule',
        id: 6,
        imageSizes: {
          allAvailable: [
            { url: 'https://mir-cdn.behance.net/project_modules/1400_webp/a.webp', width: 1400 },
            { url: 'http://mir-s3-cdn-cf.behance.net/project_modules/1400/a.png', width: 1400 },
            { url: 'https://evil.com/project_modules/max_1200_webp/a.webp', width: 1200 },
            { url: `${base}/1400_webp/a.webp`, width: 1400 },
            { url: `${base}/fs/a.png`, width: 1920 },
          ],
        },
      },
    ];
    expect(planModuleImages(modules)[0]?.candidates).toEqual([
      `${base}/1400_webp/a.webp`,
      `${base}/fs/a.png`,
    ]);
  });

  it('fails G4m when no candidate is on the allowlisted CDN host', () => {
    const modules: RawModule[] = [
      {
        __typename: 'ImageModule',
        id: 7,
        imageSizes: {
          allAvailable: [{ url: 'https://evil.com/project_modules/1400_webp/a.webp', width: 1400 }],
        },
      },
    ];
    expect(() => planModuleImages(modules)).toThrow(/\[G4m\] 7: no usable image variant/);
  });

  it('fails G4m on a known module with an unexpected shape', () => {
    const bad: RawModule[] = [{ __typename: 'ImageModule', id: 1 }];
    expect(() => planModuleImages(bad)).toThrow(SyncError);
    expect(() => planModuleImages(bad)).toThrow(/\[G4m\]/);
  });
});

describe('toContent', () => {
  it('maps every real project into entries that pass ContentSchema', () => {
    for (const project of projects) {
      const plans = planModuleImages(project.modules);
      const { content, warnings } = toContent(project.modules, imageMap(plans), project);
      expect(warnings).toEqual([]);
      expect(content).toHaveLength(project.modules.length);
      for (const entry of content) expect(ContentSchema.safeParse(entry).success).toBe(true);
      expect(contentImageIds(content)).toEqual(plans.map((plan) => plan.id));
    }
  });

  it('maps image, collection, text and embed modules from the real snapshot', () => {
    const plans = planModuleImages(allModules);
    const all = projects.flatMap(
      (project) => toContent(project.modules, imageMap(plans), project).content,
    );
    const kinds = all.map((entry) => entry.kind);
    expect(kinds.filter((kind) => kind === 'image')).toHaveLength(127);
    expect(kinds.filter((kind) => kind === 'collection')).toHaveLength(9);
    expect(kinds.filter((kind) => kind === 'text')).toHaveLength(4);
    expect(kinds.filter((kind) => kind === 'unknown')).toHaveLength(0);
    const embed = all.find((entry) => entry.kind === 'embed');
    expect(embed?.kind === 'embed' && embed.provider).toBe('figma');
    expect(embed?.kind === 'embed' && embed.src.startsWith(`${FIGMA}&scaling=`)).toBe(true);
    const image = all.find((entry) => entry.kind === 'image');
    expect(image?.kind === 'image' && image.fullBleed).toBe(true);
    const text = all.filter((entry) => entry.kind === 'text');
    for (const entry of text) {
      expect(entry.kind === 'text' && entry.html).not.toMatch(/<span|color|font-/);
    }
  });

  it('maps fullBleed 0 to false and keeps the caption', () => {
    const modules: RawModule[] = [
      {
        __typename: 'ImageModule',
        id: 3,
        fullBleed: 0,
        caption: 'A caption',
        altText: 'Image may contain: never used',
        imageSizes: { allAvailable: [{ url: CDN, width: 1400, type: 'WEBP' }] },
      },
    ];
    const { content } = toContent(modules, new Map([['3', ref('3')]]), { id: '1', slug: 's' });
    expect(content).toEqual([
      { kind: 'image', image: ref('3'), fullBleed: false, caption: 'A caption' },
    ]);
    expect(JSON.stringify(content)).not.toContain('Image may contain');
  });

  it('turns a non-allowlisted embed into unknown with a warning', () => {
    const modules: RawModule[] = [
      {
        __typename: 'EmbedModule',
        id: 9,
        originalEmbed: '<iframe src="https://www.youtube.com/embed/x?a=1&amp;b=2"></iframe>',
      },
    ];
    const result = toContent(modules, new Map(), { id: '42', slug: 'demo' });
    expect(result.content).toEqual([{ kind: 'unknown', type: 'EmbedModule' }]);
    expect(result.warnings).toEqual([
      'sync:behance: embed origin "https://www.youtube.com" in 42 (demo) is not allowlisted. It renders the Behance fallback note. Add it to the embed allowlist in src/lib/projects/ if it is safe.',
    ]);
  });

  it('falls back to fluidEmbed when originalEmbed is empty', () => {
    const modules: RawModule[] = [
      {
        __typename: 'EmbedModule',
        id: 9,
        originalEmbed: '',
        fluidEmbed: `<iframe src="${FIGMA}"></iframe>`,
      },
    ];
    const result = toContent(modules, new Map(), { id: '42', slug: 'demo' });
    expect(result.content).toEqual([{ kind: 'embed', provider: 'figma', src: FIGMA }]);
    expect(result.warnings).toEqual([]);
  });

  it('turns an embed without a parsable src into unknown with a warning', () => {
    const modules: RawModule[] = [{ __typename: 'EmbedModule', id: 9, fluidEmbed: '<div></div>' }];
    const result = toContent(modules, new Map(), { id: '42', slug: 'demo' });
    expect(result.content).toEqual([{ kind: 'unknown', type: 'EmbedModule' }]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(
      /^sync:behance: embed origin ".*" in 42 \(demo\) is not allowlisted/,
    );
  });

  it('turns an unknown module type into unknown with a warning', () => {
    const modules: RawModule[] = [{ __typename: 'VideoModule', id: 1 }];
    const result = toContent(modules, new Map(), { id: '42', slug: 'demo' });
    expect(result.content).toEqual([{ kind: 'unknown', type: 'VideoModule' }]);
    expect(result.warnings).toEqual([
      'sync:behance: unknown module type "VideoModule" in 42 (demo). It renders the Behance fallback note.',
    ]);
  });

  it('fails G4m when an image has no stored file', () => {
    const project = projects[0];
    if (project === undefined) throw new Error('no projects');
    expect(() => toContent(project.modules, new Map(), project)).toThrow(/\[G4m\]/);
  });
});
