import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import RolesMarquee from '../../src/components/sections/RolesMarquee.astro';

const ROLES = ['Web design', 'Branding', 'Social media manager', 'Graphic design'] as const;

async function render(locale: 'en' | 'es'): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(RolesMarquee, { props: { roles: ROLES, locale } });
}

function firstTag(html: string, pattern: string): string {
  const match = new RegExp(pattern).exec(html);
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
}

function classTokens(tag: string): string[] {
  const match = /class="([^"]*)"/.exec(tag);
  expect(match).not.toBeNull();
  return (match?.[1] ?? '').split(/\s+/);
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

describe('RolesMarquee', () => {
  it('renders a labelled full-bleed accent band with a visually hidden heading', async () => {
    const html = await render('en');
    const section = firstTag(html, '<section[^>]*>');
    expect(section).toContain('data-marquee');
    expect(section).toContain('aria-labelledby="roles-title"');
    const tokens = classTokens(section);
    expect(tokens).toContain('bg-accent');
    expect(tokens).toContain('text-accent-ink');

    const heading = firstTag(html, '<h2[^>]*>[^<]*</h2>');
    expect(heading).toContain('id="roles-title"');
    expect(classTokens(heading)).toContain('sr-only');
    expect(heading).toContain('>What I do</h2>');
  });

  it('renders two lists and hides the duplicate from assistive tech', async () => {
    const html = await render('en');
    const lists = html.match(/<ul[^>]*>/g) ?? [];
    expect(lists).toHaveLength(2);
    expect(lists[0]).not.toContain('aria-hidden');
    expect(lists[1]).toContain('aria-hidden="true"');
  });

  it('renders each role once per copy, in order', async () => {
    const html = await render('en');
    for (const role of ROLES) {
      expect(count(html, role)).toBe(2);
    }
    const secondList = html.indexOf('<ul', html.indexOf('<ul') + 1);
    const firstCopy = html.slice(html.indexOf('<ul'), secondList);
    const positions = ROLES.map((role) => firstCopy.indexOf(role));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('renders an invisible fixed-label pause toggle covering the band', async () => {
    const html = await render('en');
    expect(count(html, '<button')).toBe(1);
    const button = firstTag(html, '<button[^>]*>');
    expect(button).toContain('type="button"');
    expect(button).toContain('data-marquee-toggle');
    expect(button).toContain('aria-pressed="false"');
    expect(button).toContain('aria-label="Pause roles animation"');
    const tokens = classTokens(button);
    // Overlay over the whole band, hidden until motion is on.
    for (const token of ['absolute', 'inset-0', 'bg-transparent', 'hidden', 'motion-on:block']) {
      expect(tokens).toContain(token);
    }
    // White inset outline on the blue band (D-17), never the accent ring.
    expect(tokens).toContain('focus-visible:outline-accent-ink');
    expect(tokens).toContain('focus-visible:-outline-offset-4');
    expect(button).not.toMatch(/focus-visible:outline-accent(?!-ink)/);
    // No visible play/pause icon: the button is empty and is a sibling of the lists.
    expect(html).toMatch(/<button[^>]*><\/button>/);
    expect(html).not.toMatch(/<button[\s\S]*<ul/);
    expect(classTokens(firstTag(html, '<section[^>]*>'))).toContain('relative');
  });

  it('pauses on hover, keyboard focus and the paused state', async () => {
    const html = await render('en');
    const list = firstTag(html, '<ul[^>]*>');
    const tokens = classTokens(list);
    expect(tokens).toContain('group-hover:[animation-play-state:paused]');
    expect(tokens).toContain(
      'group-has-[[data-marquee-toggle]:focus-visible]:[animation-play-state:paused]',
    );
    expect(tokens).toContain('group-data-paused:[animation-play-state:paused]');
  });

  it('uses the large band size', async () => {
    const html = await render('en');
    const section = classTokens(firstTag(html, '<section[^>]*>'));
    expect(section).toEqual(expect.arrayContaining(['py-6', 'lg:py-8']));
    const item = classTokens(firstTag(html, '<li[^>]*>'));
    // One size in every motion state: toggling motion never changes the band height.
    expect(item).toEqual(expect.arrayContaining(['text-2xl', 'xl:text-[1.875rem]']));
    expect(item.some((c) => c.startsWith('motion-on:text-'))).toBe(false);
    expect(classTokens(firstTag(html, '<svg[^>]*>'))).toEqual(
      expect.arrayContaining(['size-6', 'xl:size-7']),
    );
  });

  it('hides every icon from assistive tech', async () => {
    const html = await render('en');
    const svgs = html.match(/<svg[^>]*>/g) ?? [];
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg).toContain('aria-hidden="true"');
    }
  });

  it('localizes the heading and toggle label in Spanish', async () => {
    const html = await render('es');
    expect(html).toContain('aria-label="Pausar animación de roles"');
    expect(firstTag(html, '<h2[^>]*>[^<]*</h2>')).toContain('>A qué me dedico</h2>');
  });

  it('keeps the track free of focusable or injected content', async () => {
    const html = await render('en');
    expect(html).not.toContain('tabindex');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('set:html');
  });
});
