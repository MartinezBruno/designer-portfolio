import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ContactSection from '../../src/components/contact/ContactSection.astro';
import services from '../../src/data/services.json' with { type: 'json' };
import { site } from '../../src/data/site';
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import type { ServiceView } from '../../src/lib/content/home';
import { SERVICE_CHOICES } from '../../src/lib/contact/fields';

// Same shape HomeView passes: localized, in services.json `order` order.
function servicesFor(locale: 'en' | 'es'): ServiceView[] {
  return [...services]
    .sort((a, b) => a.order - b.order)
    .map((service) => ({
      id: service.id,
      icon: service.icon as ServiceView['icon'],
      title: service.title[locale],
      items: service.items[locale],
    }));
}

async function render(locale: 'en' | 'es'): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ContactSection, {
    props: { locale, services: servicesFor(locale) },
  });
}

function classTokens(tag: string): string[] {
  const match = /class="([^"]*)"/.exec(tag);
  return match?.[1]?.split(/\s+/) ?? [];
}

function openTag(html: string, pattern: RegExp): string {
  return pattern.exec(html)?.[0] ?? '';
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

describe.each([
  ['en', en],
  ['es', es],
] as const)('ContactSection (%s)', (locale, dict) => {
  it('renders the section frame labelled by its h2', async () => {
    const html = await render(locale);
    const section = /<section[^>]*>/.exec(html)?.[0] ?? '';
    expect(section).toContain('id="contact"');
    expect(section).toContain('aria-labelledby="contact-title"');
    expect(classTokens(section)).toEqual(expect.arrayContaining(['scroll-mt-24', 'max-w-6xl']));

    const h2 = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(html);
    expect(h2?.[0]).toContain('id="contact-title"');
    expect(h2?.[1]?.trim()).toBe(escapeHtml(dict['contact.heading']));
    expect(classTokens(h2?.[0] ?? '')).toEqual(
      expect.arrayContaining(['font-display', 'text-4xl', 'font-semibold', 'tracking-tight']),
    );
    expect(html).toContain(escapeHtml(dict['contact.intro']));
  });

  it('lays out two columns from lg', async () => {
    const html = await render(locale);
    expect(html).toContain('lg:grid-cols-12');
    expect(html).toContain('lg:col-span-5');
    expect(html).toMatch(/<div[^>]*lg:col-span-7[^>]*data-contact-column/);
  });

  it('offers the direct email link and the socials', async () => {
    const html = await render(locale);
    expect(html).toContain(`href="mailto:${site.email}"`);
    expect(html).toContain(`href="${site.socials.behance}"`);
    expect(html).toContain(escapeHtml(dict['footer.behance']));
  });

  it('ships the no-JS mailto block visible, without noscript', async () => {
    const html = await render(locale);
    const block = /<div[^>]*data-contact-nojs[^>]*>/.exec(html)?.[0] ?? '';
    expect(block).not.toBe('');
    expect(block).not.toMatch(/\bhidden\b/);
    expect(html).toContain(
      escapeHtml(interpolate(dict['contact.nojs.body'], { email: site.email })),
    );
    const subject = encodeURIComponent(dict['contact.nojs.subject']);
    expect(html).toContain(`href="mailto:${site.email}?subject=${subject}"`);
    expect(html).toContain(escapeHtml(dict['contact.nojs.button']));
    expect(html).not.toContain('<noscript');
    expect(html).not.toContain('challenges.cloudflare.com');
  });

  it('ships the hidden, unvalidated form named by the section heading', async () => {
    const html = await render(locale);
    const form = openTag(html, /<form[^>]*>/);
    expect(form).toContain('data-contact-form');
    expect(form).toMatch(/\shidden[\s>]/);
    expect(form).toContain('novalidate');
    expect(form).toContain('aria-labelledby="contact-title"');
    expect(form).toContain(`data-locale="${locale}"`);
    expect(form).toContain('data-contact-strings="{');
  });

  it('renders one fieldset of service radios with other checked', async () => {
    const html = await render(locale);
    expect(html.match(/<fieldset/g)).toHaveLength(1);
    const legend = /<legend[^>]*>([\s\S]*?)<\/legend>/.exec(html)?.[1] ?? '';
    expect(legend).toContain(escapeHtml(dict['contact.service.legend']));
    expect(legend).toMatch(/<span[^>]*>[^<]*\(/);
    expect(legend).toContain(escapeHtml(dict['contact.optional']));

    const radios = [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
    expect(radios).toHaveLength(5);
    expect(radios.map((tag) => /value="([^"]*)"/.exec(tag)?.[1])).toEqual([...SERVICE_CHOICES]);
    for (const tag of radios) expect(tag).toContain('name="service"');
    const checked = radios.filter((tag) => /\schecked[\s>/]/.test(tag));
    expect(checked).toHaveLength(1);
    expect(checked[0]).toContain('value="other"');

    for (const service of servicesFor(locale)) {
      expect(html).toContain(escapeHtml(service.title));
    }
    expect(html).toContain(escapeHtml(dict['contact.service.other']));
  });

  it('renders the three fields with their limits and autocomplete', async () => {
    const html = await render(locale);
    const name = openTag(html, /<input[^>]*id="contact-name"[^>]*>/);
    expect(name).toContain('autocomplete="name"');
    expect(name).toContain('maxlength="100"');
    expect(name).toMatch(/\srequired[\s>/]/);

    const email = openTag(html, /<input[^>]*id="contact-email"[^>]*>/);
    expect(email).toContain('type="email"');
    expect(email).toContain('autocomplete="email"');
    expect(email).toContain('maxlength="254"');
    expect(email).toMatch(/\srequired[\s>/]/);

    const message = openTag(html, /<textarea[^>]*id="contact-message"[^>]*>/);
    expect(message).toContain('maxlength="5000"');
    expect(message).toContain('aria-describedby="contact-message-hint"');
    expect(message).not.toContain('minlength');
    expect(html).toContain('id="contact-message-hint"');

    for (const id of ['contact-name', 'contact-email', 'contact-message']) {
      expect(html).toContain(`for="${id}"`);
    }
  });

  it('hides the honeypot off-screen and out of the Tab order', async () => {
    const html = await render(locale);
    const wrapper =
      /<div[^>]*aria-hidden="true"[^>]*>\s*<label[^>]*for="contact-extra"[\s\S]*?<\/div>/.exec(
        html,
      )?.[0] ?? '';
    expect(wrapper).not.toBe('');
    expect(classTokens(wrapper)).toContain('-left-[9999px]');
    const input = openTag(wrapper, /<input[^>]*>/);
    expect(input).toContain('name="extra_info"');
    expect(input).toContain('tabindex="-1"');
    expect(input).toContain('autocomplete="off"');
  });

  it('posts the locale, reserves the Turnstile slot and has a submit button', async () => {
    const html = await render(locale);
    const localeInput = openTag(html, /<input[^>]*name="locale"[^>]*>/);
    expect(localeInput).toContain('type="hidden"');
    expect(localeInput).toContain(`value="${locale}"`);

    const slot = openTag(html, /<div[^>]*data-turnstile[^>]*>/);
    expect(classTokens(slot)).toEqual(expect.arrayContaining(['min-h-[140px]', 'w-[150px]']));
    expect(html).not.toContain('cf-turnstile"');
    // 07-21: no inherited leading under the inline widget iframe, so it stays at the 140 px reserve.
    expect(classTokens(slot)).toContain('leading-[0]');

    const submit = openTag(html, /<button[^>]*data-contact-submit[^>]*>/);
    expect(submit).toContain('type="submit"');
    expect(html).toContain(escapeHtml(dict['contact.submit']));
  });

  it('splits the submit into a stationary shell and a magnetic face (Phase 6 D-12)', async () => {
    const html = await render(locale);
    const submit = openTag(html, /<button[^>]*data-contact-submit[^>]*>/);
    expect(submit).toContain('data-magnetic="pill"');
    expect(classTokens(submit)).toEqual(
      expect.arrayContaining(['h-12', 'rounded-full', 'aria-disabled:cursor-progress']),
    );
    expect(classTokens(submit)).not.toContain('bg-accent');
    const inner = /<button[^>]*data-contact-submit[^>]*>([\s\S]*?)<\/button>/.exec(html)?.[1] ?? '';
    const face = openTag(inner, /<span[^>]*data-magnetic-face[^>]*>/);
    expect(classTokens(face)).toEqual(expect.arrayContaining(['bg-accent', 'px-6']));
    for (const hook of ['data-contact-submit-label', 'data-icon-ready', 'data-icon-sending']) {
      expect(inner).toContain(hook);
    }
  });

  it('ships the success panel hidden and exactly one status region', async () => {
    const html = await render(locale);
    expect(openTag(html, /<div[^>]*data-contact-success[^>]*>/)).toMatch(/\shidden[\s>]/);
    const heading = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(html);
    expect(heading?.[0]).toContain('tabindex="-1"');
    expect(heading?.[1]?.trim()).toBe(escapeHtml(dict['contact.success.heading']));
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(openTag(html, /<[^>]*role="status"[^>]*>/)).toContain('data-contact-status');
  });
});

describe('contact component sources', () => {
  it.each(['ContactSection.astro', 'ContactForm.astro', 'ServiceChips.astro'])(
    '%s has no innerHTML or set:html',
    (file) => {
      const source = readFileSync(resolve(process.cwd(), 'src/components/contact', file), 'utf8');
      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('set:html');
    },
  );
});
