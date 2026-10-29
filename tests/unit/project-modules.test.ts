import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import CollectionModule from '../../src/components/project/CollectionModule.astro';
import ImageModule from '../../src/components/project/ImageModule.astro';
import ProjectModule from '../../src/components/project/ProjectModule.astro';
import TextModule from '../../src/components/project/TextModule.astro';
import UnknownModule from '../../src/components/project/UnknownModule.astro';
import type { CollectionItemView, ModuleView } from '../../src/lib/projects/model';

const BEHANCE_URL = 'https://www.behance.net/gallery/172473551/Mart';
const HINT = '<span class="sr-only" lang="en">(opens in a new tab)</span>';

type ImageProps = Omit<Extract<ModuleView, { kind: 'image' }>, 'kind'>;

const imageProps: ImageProps = {
  image: portrait,
  alt: 'Mart — image 1 of 3',
  widths: [portrait.width],
  fullBleed: true,
  caption: null,
  captionLang: null,
  eager: false,
};

async function container(): Promise<AstroContainer> {
  return AstroContainer.create();
}

function imgTags(html: string): string[] {
  return html.match(/<img\b[^>]*>/g) ?? [];
}

function firstTag(html: string): string {
  return /<[a-z]+\b[^>]*>/.exec(html.trim())?.[0] ?? '';
}

describe('TextModule', () => {
  const html = `<div style="text-align: center">Hecho por <a href="https://example.com" target="_blank" rel="noopener noreferrer">Martina${HINT}</a></div>`;

  it('renders the html in a div root with lang only when given', async () => {
    const c = await container();
    const es = await c.renderToString(TextModule, { props: { html, lang: 'es' } });
    expect(firstTag(es)).toMatch(/^<div\b/);
    expect(firstTag(es)).toContain('lang="es"');
    expect(firstTag(es)).toContain('max-w-[65ch]');
    const none = await c.renderToString(TextModule, { props: { html, lang: null } });
    expect(firstTag(none)).not.toContain('lang=');
  });

  it('keeps the new-tab hint span and the link attributes', async () => {
    const c = await container();
    const out = await c.renderToString(TextModule, { props: { html, lang: 'es' } });
    expect(out).toContain(`Martina${HINT}</a>`);
    expect(out).toContain('rel="noopener noreferrer"');
  });
});

describe('ImageModule', () => {
  it('sets width and height and loads lazily without fetchpriority by default', async () => {
    const c = await container();
    const out = await c.renderToString(ImageModule, { props: imageProps });
    const [img] = imgTags(out);
    expect(img).toContain(`width="${String(portrait.width)}"`);
    expect(img).toContain(`height="${String(portrait.height)}"`);
    expect(img).toContain('loading="lazy"');
    expect(img).not.toContain('fetchpriority');
    expect(img).toContain('alt="Mart — image 1 of 3"');
    expect(out).not.toContain('Image may contain');
    expect(out).toContain('type="image/avif"');
    expect(out).not.toMatch(/rounded|shadow|border/);
  });

  it('loads eagerly with high fetch priority only when eager', async () => {
    const c = await container();
    const out = await c.renderToString(ImageModule, { props: { ...imageProps, eager: true } });
    const [img] = imgTags(out);
    expect(img).toContain('loading="eager"');
    expect(img).toContain('fetchpriority="high"');
  });

  it('pads non-full-bleed images and wraps a caption in a figure with its lang', async () => {
    const c = await container();
    const out = await c.renderToString(ImageModule, {
      props: { ...imageProps, fullBleed: false, caption: 'Pie de foto', captionLang: 'es' },
    });
    expect(out).toContain('max-w-6xl');
    expect(out).toMatch(/<figure\b/);
    expect(out).toMatch(/<figcaption lang="es"[^>]*>\s*Pie de foto\s*<\/figcaption>/);
    const bare = await c.renderToString(ImageModule, { props: imageProps });
    expect(bare).not.toContain('<figure');
  });
});

describe('CollectionModule', () => {
  const item = (ratio: number, eager = false): CollectionItemView => ({
    image: portrait,
    alt: `item ${String(ratio)}`,
    ratio,
    widths: [portrait.width],
    sizes: '(min-width: 1400px) 700px, (min-width: 640px) 50vw, 100vw',
    eager,
  });

  it('renders rows of items carrying --ar and the grow class', async () => {
    const c = await container();
    const out = await c.renderToString(CollectionModule, {
      props: {
        rows: [
          [item(0.75, true), item(1.5)],
          [item(1), item(1)],
        ],
      },
    });
    expect(out.match(/class="flex flex-col sm:flex-row"/g)).toHaveLength(2);
    expect(out).toContain('--ar:0.75');
    expect(out).toContain('--ar:1.5');
    expect(out.match(/sm:grow-\(--ar\)/g)).toHaveLength(4);
    const imgs = imgTags(out);
    expect(imgs).toHaveLength(4);
    expect(imgs[0]).toContain('fetchpriority="high"');
    for (const img of imgs.slice(1)) {
      expect(img).toContain('loading="lazy"');
      expect(img).not.toContain('fetchpriority');
    }
    expect(out).not.toMatch(/rounded|shadow|gap-/);
  });
});

describe('UnknownModule', () => {
  it('links to Behance in a new tab with rel noopener noreferrer', async () => {
    const c = await container();
    const out = await c.renderToString(UnknownModule, {
      props: { behanceUrl: BEHANCE_URL, locale: 'es' },
    });
    expect(out).toContain('Esta parte del proyecto se ve mejor en Behance.');
    expect(out).toContain(`href="${BEHANCE_URL}"`);
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('Verla en Behance');
  });
});

describe('ProjectModule', () => {
  const embed: ModuleView = {
    kind: 'embed',
    provider: 'figma',
    providerName: 'Figma',
    src: 'https://embed.figma.com/proto/abc',
    iframeTitle: 'Mart — interactive Figma prototype',
  };

  it('renders the click-to-load facade for embeds, with no iframe and a hidden button', async () => {
    const c = await container();
    const out = await c.renderToString(ProjectModule, {
      props: { module: embed, behanceUrl: BEHANCE_URL, locale: 'en' },
    });
    expect(out).toMatch(/<div\b[^>]*data-embed-facade/);
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('preconnect');
    expect(out).not.toContain('This part of the project is best viewed on Behance.');
    const button = /<button\b[^>]*data-embed-load[^>]*>/.exec(out)?.[0] ?? '';
    expect(button).toMatch(/\shidden[\s>=]/);
    expect(button).toContain('type="button"');
    expect(button).toContain('bg-ink');
    expect(button).not.toContain('bg-accent');
    expect(out).toContain('Interactive prototype');
    expect(out).toContain('Loading it connects to Figma.');
    expect(out).toContain('Load interactive prototype');
  });

  it('keeps the Figma URL only inside data-src and the iframe title in data-title', async () => {
    const c = await container();
    const out = await c.renderToString(ProjectModule, {
      props: { module: embed, behanceUrl: BEHANCE_URL, locale: 'en' },
    });
    expect(out.match(/embed\.figma\.com/g)).toHaveLength(1);
    expect(out).toContain('data-src="https://embed.figma.com/proto/abc"');
    expect(out).toContain('data-title="Mart — interactive Figma prototype"');
  });

  it('links the facade fallback to Behance in a new tab, localized', async () => {
    const c = await container();
    const out = await c.renderToString(ProjectModule, {
      props: { module: embed, behanceUrl: BEHANCE_URL, locale: 'es' },
    });
    const link = /<a\b[^>]*>/.exec(out)?.[0] ?? '';
    expect(link).toContain(`href="${BEHANCE_URL}"`);
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
    expect(out).toContain('Ver el prototipo en Behance');
    expect(out).toContain('Al cargarlo te conectas a Figma.');
    expect(out).toContain('Cargar prototipo interactivo');
  });

  it('dispatches image and text modules', async () => {
    const c = await container();
    const image = await c.renderToString(ProjectModule, {
      props: { module: { kind: 'image', ...imageProps }, behanceUrl: BEHANCE_URL, locale: 'en' },
    });
    expect(imgTags(image)).toHaveLength(1);
    const text = await c.renderToString(ProjectModule, {
      props: {
        module: { kind: 'text', html: '<p>Hola</p>', lang: 'es' },
        behanceUrl: BEHANCE_URL,
        locale: 'en',
      },
    });
    expect(text).toContain('<p>Hola</p>');
  });
});

describe('reveal hooks (Phase 6 D-04)', () => {
  const collectionItem: CollectionItemView = {
    image: portrait,
    alt: 'item',
    ratio: 1,
    widths: [portrait.width],
    sizes: '100vw',
    eager: false,
  };
  const stack: ModuleView[] = [
    { kind: 'image', ...imageProps },
    { kind: 'collection', rows: [[collectionItem]] },
    {
      kind: 'embed',
      provider: 'figma',
      providerName: 'Figma',
      src: 'https://embed.figma.com/proto/abc',
      iframeTitle: 'Mart — interactive Figma prototype',
    },
    { kind: 'unknown' },
  ];

  it('settles a TextModule as one block on its root', async () => {
    const c = await container();
    const out = await c.renderToString(TextModule, { props: { html: '<p>Hola</p>', lang: null } });
    expect(firstTag(out)).toContain('data-reveal="settle"');
    expect(out.match(/data-reveal=/g)).toHaveLength(1);
  });

  it('keeps ImageModule and CollectionModule static', async () => {
    const c = await container();
    const image = await c.renderToString(ImageModule, { props: imageProps });
    expect(image).not.toContain('data-reveal');
    const collection = await c.renderToString(CollectionModule, {
      props: { rows: [[collectionItem, collectionItem]] },
    });
    expect(collection).not.toContain('data-reveal');
    const unknown = await c.renderToString(UnknownModule, {
      props: { behanceUrl: BEHANCE_URL, locale: 'en' },
    });
    expect(unknown).not.toContain('data-reveal');
  });

  it('dispatches every stack module kind without a reveal hook', async () => {
    const c = await container();
    for (const module of stack) {
      const out = await c.renderToString(ProjectModule, {
        props: { module, behanceUrl: BEHANCE_URL, locale: 'en' },
      });
      expect(out).not.toContain('data-reveal');
    }
  });
});

describe('set:html guard (T-04-01)', () => {
  function astroFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return astroFiles(path);
      return /\.(astro|ts|tsx|js|mjs)$/.test(entry.name) ? [path] : [];
    });
  }

  it('appears only in BaseLayout (motion gate) and TextModule (sanitized HTML)', () => {
    const users = astroFiles('src')
      .filter((file) => readFileSync(file, 'utf8').includes('set:html'))
      .map((file) => relative('.', file).split('\\').join('/'))
      .sort();
    expect(users).toEqual([
      'src/components/project/TextModule.astro',
      'src/layouts/BaseLayout.astro',
    ]);
  });
});
