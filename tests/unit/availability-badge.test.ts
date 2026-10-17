import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import AvailabilityBadge from '../../src/components/ui/AvailabilityBadge.astro';

async function render(props: { available: boolean; locale: 'en' | 'es' }): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(AvailabilityBadge, { props });
}

describe('availability badge', () => {
  it('renders the English open pill with a decorative success dot', async () => {
    const html = await render({ available: true, locale: 'en' });
    expect(html).toContain('Open to new projects');
    expect(html.match(/<p[\s>]/g) ?? []).toHaveLength(1);
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>/);
    expect(html).toMatch(/<span[^>]*class="[^"]*\bbg-success\b[^"]*"/);
  });

  it('renders the Spanish open pill', async () => {
    const html = await render({ available: true, locale: 'es' });
    expect(html).toContain('Abierta a nuevos proyectos');
  });

  it('renders nothing at all when unavailable (D-08)', async () => {
    const html = await render({ available: false, locale: 'en' });
    expect(html.trim()).toBe('');
  });

  it('is static: no live region, no tab stop, no link, no accent, no motion', async () => {
    const html = await render({ available: true, locale: 'en' });
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('aria-live');
    expect(html).not.toContain('tabindex');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('bg-accent');
    expect(html).not.toContain('animate-');
  });
});
