import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ToolsRow from '../../src/components/sections/ToolsRow.astro';
import type { ToolView } from '../../src/lib/content/home';

const tools: ToolView[] = [
  { id: 'illustrator', name: 'Adobe Illustrator', icon: 'illustrator' },
  { id: 'indesign', name: 'Adobe InDesign', icon: 'indesign' },
  { id: 'photoshop', name: 'Adobe Photoshop', icon: 'photoshop' },
  { id: 'figma', name: 'Figma', icon: 'figma' },
  { id: 'lightroom', name: 'Adobe Lightroom', icon: 'lightroom' },
];

async function render(locale: 'en' | 'es'): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ToolsRow, { props: { tools, locale } });
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

/** Opening tags of every element carrying data-tooltip. */
function tooltipTags(html: string): string[] {
  return html.match(/<span[^>]*data-tooltip[^>]*>/g) ?? [];
}

describe('ToolsRow', () => {
  it('renders a labelled section with the English heading', async () => {
    const html = await render('en');
    expect(html).toMatch(/<section[^>]*aria-labelledby="tools-title"/);
    expect(html).toMatch(/<h2[^>]*id="tools-title"[^>]*>\s*Tools I work with\s*<\/h2>/);
  });

  it('renders five focusable role=img tiles named by an sr-only span', async () => {
    const html = await render('en');
    expect(count(html, 'role="img"')).toBe(5);
    expect(count(html, 'tabindex="0"')).toBe(5);
    for (const tool of tools) {
      expect(html).toContain(`aria-labelledby="tool-${tool.id}-name"`);
      const span = new RegExp(`<span[^>]*id="tool-${tool.id}-name"[^>]*>${tool.name}</span>`);
      const match = html.match(span);
      expect(match).not.toBeNull();
      expect(match?.[0]).toContain('sr-only');
    }
  });

  it('keeps the D-12 tool order', async () => {
    const html = await render('en');
    const positions = tools.map((tool) => html.indexOf(`id="tool-${tool.id}-name"`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('renders five aria-hidden tooltips anchored to stay inside the viewport', async () => {
    const html = await render('en');
    const tags = tooltipTags(html);
    expect(tags).toHaveLength(5);
    for (const tag of tags) expect(tag).toContain('aria-hidden="true"');
    expect(tags[0]).toMatch(/\bleft-0\b/);
    expect(tags[4]).toMatch(/\bright-0\b/);
    for (const tag of tags.slice(1, 4)) {
      expect(tag).toContain('left-1/2');
      expect(tag).toContain('-translate-x-1/2');
    }
  });

  it('marks icons decorative and avoids links, lists roles, describedby and accent tooltips', async () => {
    const html = await render('en');
    const svgs = html.match(/<svg[^>]*>/g) ?? [];
    expect(svgs).toHaveLength(5);
    for (const svg of svgs) expect(svg).toContain('aria-hidden="true"');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('role="list"');
    expect(html).not.toContain('aria-describedby');
    const tooltipBlocks =
      html.match(/<span[^>]*data-tooltip[^>]*>[\s\S]*?<\/span>\s*<\/span>/g) ?? [];
    expect(tooltipBlocks).toHaveLength(5);
    for (const block of tooltipBlocks) expect(block).not.toContain('accent');
  });

  it('inverts tile colors on hover, keyboard focus and tap, reverting on Esc dismissal', async () => {
    const html = await render('en');
    const tiles = html.match(/<span[^>]*\bdata-tool\b(?!tip)[^>]*>/g) ?? [];
    expect(tiles).toHaveLength(5);
    for (const tile of tiles) {
      const tokens = (/class="([^"]*)"/.exec(tile)?.[1] ?? '').split(/\s+/);
      expect(tokens).toEqual(expect.arrayContaining(['bg-surface', 'text-ink']));
      for (const state of ['hover', 'focus-visible', 'data-open']) {
        expect(tokens).toContain(`${state}:bg-ink`);
        expect(tokens).toContain(`${state}:text-surface`);
      }
      expect(tokens).toContain('data-dismissed:bg-surface!');
      expect(tokens).toContain('data-dismissed:text-ink!');
      expect(tokens).toContain('motion-safe:transition-colors');
      expect(tokens).not.toContain('transition-colors');
      expect(tokens).toContain('focus-visible:outline-accent');
    }
  });

  it('renders the Spanish heading with untranslated brand names', async () => {
    const html = await render('es');
    expect(html).toMatch(/<h2[^>]*>\s*Herramientas con las que trabajo\s*<\/h2>/);
    for (const tool of tools) expect(html).toContain(`>${tool.name}</span>`);
  });
});
