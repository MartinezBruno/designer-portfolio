import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ServiceCard from '../../src/components/ui/ServiceCard.astro';

async function renderCard(): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ServiceCard, {
    props: {
      title: 'Branding',
      icon: 'palette',
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
    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toContain('aria-hidden="true"');
    const chip = /<span[^>]*>\s*<svg/.exec(html)?.[0] ?? '';
    expect(classTokens(chip)).toEqual(expect.arrayContaining(['size-12', 'rounded-full']));
  });

  it('does not look or behave interactive', async () => {
    const html = await renderCard();
    for (const forbidden of [
      '<a ',
      'cursor-pointer',
      'hover:',
      'line-clamp',
      'role="list"',
      'description',
    ]) {
      expect(html).not.toContain(forbidden);
    }
  });
});
