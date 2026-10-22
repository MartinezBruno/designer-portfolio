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
      icon: 'palette',
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
  it('renders a styled li root with an h3 title and a disc bullet list', async () => {
    const html = (await renderCard()).trim();
    const root = /^<li[^>]*>/.exec(html)?.[0] ?? '';
    expect(root).not.toBe('');
    expect(classTokens(root)).toEqual(
      expect.arrayContaining(['h-full', 'rounded-2xl', 'bg-surface-alt', 'p-6']),
    );
    expect(html).toMatch(/<h3[^>]*>\s*Branding\s*<\/h3>/);
    const list = /<ul[^>]*>/.exec(html)?.[0] ?? '';
    expect(classTokens(list)).toContain('list-disc');
    expect(html.match(/<li[\s>]/g)?.length).toBe(7);
  });

  it('renders Visual identity as the first bullet like any other bullet', async () => {
    const html = await renderCard();
    const bullets = [...html.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
    expect(bullets).toHaveLength(6);
    expect(bullets[0]).toBe('Visual identity');
  });

  it('renders one decorative icon inside a round chip', async () => {
    const html = await renderCard();
    const svgs = html.match(/<svg[^>]*>/g) ?? [];
    // The service icon plus the link's trailing arrow, both decorative.
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) expect(svg).toContain('aria-hidden="true"');
    const chip = /<span[^>]*>\s*<svg/.exec(html)?.[0] ?? '';
    expect(classTokens(chip)).toEqual(expect.arrayContaining(['size-12', 'rounded-full']));
  });

  it('only the Ask about this link is interactive', async () => {
    const html = (await renderCard()).trim();
    const anchors = html.match(/<a[\s>][^>]*>/g) ?? [];
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toContain('href="/?service=branding#contact"');
    // The link is the card's last child, inside a mt-auto paragraph.
    expect(html).toMatch(/<p class="mt-auto">\s*<a[^>]*>[\s\S]*<\/a>\s*<\/p>\s*<\/li>$/);
    // Visible label (hidden from the a11y tree), the full name for assistive tech, then the
    // decorative arrow.
    expect(html).toMatch(
      /<a[^>]*>\s*<span aria-hidden="true">Ask about this<\/span>\s*<span class="sr-only">Ask about this: Branding<\/span>\s*<svg[^>]*aria-hidden="true"/,
    );
    const root = /^<li[^>]*>/.exec(html)?.[0] ?? '';
    expect(classTokens(root)).toEqual([
      'bg-surface-alt',
      'flex',
      'h-full',
      'flex-col',
      'gap-4',
      'rounded-2xl',
      'p-6',
    ]);
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
    icon: 'vector',
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
    icon: 'layout',
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
    icon: 'palette',
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
    icon: 'speakerphone',
    title: 'Social media',
    items: ['Social media management', 'Story and post design', 'Feed design'],
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

  it('renders the 4 cards in the order received inside a responsive grid', async () => {
    const html = await renderSection('en');
    expect(html.match(/<h3[\s>]/g)).toHaveLength(4);
    const positions = services.map((service) => html.indexOf(`>${service.title}</h3>`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    const grid = /<ul[^>]*>/.exec(html)?.[0] ?? '';
    expect(classTokens(grid)).toEqual(
      expect.arrayContaining(['grid', 'gap-6', 'sm:grid-cols-2', 'lg:grid-cols-4']),
    );
    expect(html.match(/<li[\s>]/g)).toHaveLength(22);
    const hrefs = [...html.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(services.map((service) => `/?service=${service.id}#contact`));
  });

  it('renders the Spanish heading and Spanish card links', async () => {
    const html = await renderSection('es');
    expect(html).toMatch(/<h2[^>]*>\s*Qué puedo hacer por ti\s*<\/h2>/);
    const hrefs = [...html.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(services.map((service) => `/es/?service=${service.id}#contact`));
    expect(html.match(/<span class="sr-only">Consultar: /g)).toHaveLength(4);
  });
});
