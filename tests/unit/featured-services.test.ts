import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import FeaturedServices from '../../src/components/sections/FeaturedServices.astro';
import ServiceCard from '../../src/components/ui/ServiceCard.astro';
import type { ServiceView } from '../../src/lib/content/home';

async function renderCard(): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ServiceCard, {
    props: {
      title: 'Branding',
      href: '/?service=branding#contact',
      locale: 'en',
      items: [
        'Visual identity',
        'Logo',
        'Typography',
        'Color palette',
        'Mockups',
        'Brand applications for web and print',
      ],
    },
  });
}

function classTokens(tag: string): string[] {
  const match = /class="([^"]*)"/.exec(tag);
  return match?.[1]?.split(/\s+/) ?? [];
}

describe('service card', () => {
  it('renders an li root with an h3 title and a plain item list', async () => {
    const html = (await renderCard()).trim();
    const root = /^<li[^>]*>/.exec(html)?.[0] ?? '';
    expect(root).not.toBe('');
    expect(classTokens(root)).toEqual(expect.arrayContaining(['flex', 'flex-col', 'items-start']));
    // Typographic index, not a card: no surface, radius or padding on the root.
    expect(classTokens(root)).not.toEqual(expect.arrayContaining(['bg-surface-alt']));
    expect(html).toMatch(/<h3[^>]*>\s*Branding\s*<\/h3>/);
    const list = /<ul[^>]*>/.exec(html)?.[0] ?? '';
    expect(classTokens(list)).toEqual(expect.arrayContaining(['grid', 'sm:grid-cols-2']));
    expect(html.match(/<li[\s>]/g)?.length).toBe(7);
  });

  it('renders Visual identity as the first bullet like any other bullet', async () => {
    const html = await renderCard();
    const bullets = [...html.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
    expect(bullets).toHaveLength(6);
    expect(bullets[0]).toBe('Visual identity');
  });

  it('renders only the decorative link arrow, no icon chip', async () => {
    const html = await renderCard();
    const svgs = html.match(/<svg[^>]*>/g) ?? [];
    // Redesign: no icon-topped card; the link's trailing arrow is the only icon.
    expect(svgs).toHaveLength(1);
    for (const svg of svgs) expect(svg).toContain('aria-hidden="true"');
  });

  it('only the Ask about this link is interactive', async () => {
    const html = (await renderCard()).trim();
    const anchors = html.match(/<a[\s>][^>]*>/g) ?? [];
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toContain('href="/?service=branding#contact"');
    // The link sits beside the title (inside the heading row), before the item list.
    expect(html).toMatch(/<\/h3>\s*<p class="shrink-0">\s*<a[^>]*>[\s\S]*<\/a>\s*<\/p>/);
    expect(html.indexOf('</h3>')).toBeLessThan(html.indexOf('<ul'));
    // Visible label (hidden from the a11y tree), the full name for assistive tech, then the
    // decorative arrow.
    expect(html).toMatch(
      /<a[^>]*>\s*<span aria-hidden="true">Ask about this<\/span>\s*<span class="sr-only">Ask about this: Branding<\/span>\s*<svg[^>]*aria-hidden="true"/,
    );
    const root = /^<li[^>]*>/.exec(html)?.[0] ?? '';
    expect(classTokens(root)).toEqual(['flex', 'flex-col', 'items-start', 'gap-5']);
    // hover: lives only on the link's class list.
    const hoverTags = (html.match(/<[a-z][^>]*>/g) ?? []).filter((tag) => tag.includes('hover:'));
    expect(hoverTags).toEqual([anchors[0]]);
    for (const forbidden of [
      'cursor-pointer',
      'shadow',
      'line-clamp',
      'role="list"',
      'description',
    ]) {
      expect(html).not.toContain(forbidden);
    }
  });
});

const services: ServiceView[] = [
  {
    id: 'graphic-design',
    title: 'Graphic design',
    items: [
      'Merchandise and packaging design',
      'Watermarks',
      'Thumbnails and covers',
      'Multimedia pieces',
    ],
  },
  {
    id: 'web-design',
    title: 'Web design',
    items: [
      'Wireframes and assets',
      'Responsive design',
      'Prototyping',
      'Design reviews and feedback',
      'UX/UI design',
    ],
  },
  {
    id: 'branding',
    title: 'Branding',
    items: [
      'Visual identity',
      'Logo',
      'Typography',
      'Color palette',
      'Mockups',
      'Brand applications for web and print',
    ],
  },
  {
    id: 'social-media',
    title: 'Social media',
    items: ['Social media management', 'Story and post design', 'Feed design'],
  },
  {
    id: 'photography',
    title: 'Photography',
    items: [
      'Product photography',
      'Portraits',
      'Photos for social media',
      'Editing and retouching',
    ],
  },
];

async function renderSection(locale: 'en' | 'es'): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(FeaturedServices, { props: { services, locale } });
}

describe('featured services section', () => {
  it('renders a labelled section with the English heading', async () => {
    const html = await renderSection('en');
    expect(html).toMatch(/<section[^>]*aria-labelledby="services-title"/);
    expect(html).toMatch(/<h2[^>]*id="services-title"[^>]*>\s*What I can do for you\s*<\/h2>/);
  });

  it('renders the 5 cards in the order received inside a responsive grid', async () => {
    const html = await renderSection('en');
    expect(html.match(/<h3[\s>]/g)).toHaveLength(5);
    const positions = services.map((service) => html.indexOf(`>${service.title}</h3>`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    const grid = /<ul[^>]*>/.exec(html)?.[0] ?? '';
    expect(classTokens(grid)).toEqual(
      expect.arrayContaining(['flex', 'flex-col', 'lg:col-span-8']),
    );
    expect(html.match(/<li[\s>]/g)).toHaveLength(27);
    const hrefs = [...html.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(services.map((service) => `/?service=${service.id}#contact`));
  });

  it('renders the Spanish heading and Spanish card links', async () => {
    const html = await renderSection('es');
    expect(html).toMatch(/<h2[^>]*>\s*Qué puedo hacer por ti\s*<\/h2>/);
    const hrefs = [...html.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(services.map((service) => `/es/?service=${service.id}#contact`));
    expect(html.match(/<span class="sr-only">Consultar: /g)).toHaveLength(5);
  });
});
