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

/** Opening tags of the tool items. */
function toolItems(html: string): string[] {
  return html.match(/<li[^>]*\bdata-tool\b[^>]*>/g) ?? [];
}

describe('ToolsRow', () => {
  it('renders a labelled section with the English heading', async () => {
    const html = await render('en');
    expect(html).toMatch(/<section[^>]*aria-labelledby="tools-title"/);
    expect(html).toMatch(/<h2[^>]*id="tools-title"[^>]*>\s*Tools I work with\s*<\/h2>/);
  });

  it('shows every tool name as visible text, in the D-12 order', async () => {
    const html = await render('en');
    expect(toolItems(html)).toHaveLength(5);
    const positions = tools.map((tool) => html.indexOf(`>${tool.name}</span>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    // Visible names: no sr-only name spans, no tooltips.
    expect(html).not.toContain('sr-only');
    expect(html).not.toContain('data-tooltip');
  });

  it('has no tab stops or interactive roles and keeps the marks decorative', async () => {
    const html = await render('en');
    expect(count(html, 'tabindex=')).toBe(0);
    expect(html).not.toContain('role="img"');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('<button');
    const svgs = html.match(/<svg[^>]*>/g) ?? [];
    expect(svgs).toHaveLength(5);
    for (const svg of svgs) expect(svg).toContain('aria-hidden="true"');
  });

  it('renders the Spanish heading with untranslated brand names', async () => {
    const html = await render('es');
    expect(html).toMatch(/<h2[^>]*>\s*Herramientas con las que trabajo\s*<\/h2>/);
    for (const tool of tools) expect(html).toContain(`>${tool.name}</span>`);
  });
});
