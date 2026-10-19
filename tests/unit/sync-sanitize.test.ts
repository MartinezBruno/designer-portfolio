import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import committed from '../../src/data/behance/snapshot.json';
import {
  cleanTextHtml,
  extractEmbedSrc,
  plainCaption,
  sanitizeText,
} from '../../scripts/behance/sanitize';

interface TextLike {
  __typename: string;
  id?: number | string;
  text?: string;
  originalEmbed?: string;
  fluidEmbed?: string;
}

const modulesOf = (projectId: string): TextLike[] => {
  const project = committed.projects.find((entry) => entry.id === projectId);
  if (project === undefined) throw new Error(`missing project ${projectId}`);
  return project.modules as TextLike[];
};

const realTexts: { project: string; html: string }[] = committed.projects.flatMap((project) =>
  (project.modules as TextLike[])
    .filter((module) => module.__typename === 'TextModule' && typeof module.text === 'string')
    .map((module) => ({ project: project.slug, html: module.text ?? '' })),
);

const textOf = (projectId: string): string => {
  const module = modulesOf(projectId).find((entry) => entry.__typename === 'TextModule');
  if (module?.text === undefined) throw new Error(`no TextModule in ${projectId}`);
  return module.text;
};

const XSS_FIXTURES = [
  '<img src=x onerror=alert(1)>',
  '<script>alert(1)</script>',
  '<iframe src="https://evil.example"></iframe>',
  '<svg onload=alert(1)></svg>',
  '<a href="javascript:alert(1)">x</a>',
  '<a href="//evil.com">x</a>',
  '<div style="background:url(javascript:alert(1))">x</div>',
  '<p onclick="x">t</p>',
  '<a href="data:text/html,<script>alert(1)</script>">x</a>',
];

describe('sanitizeText on the real TextModules', () => {
  it('finds the 4 real TextModules in the committed snapshot', () => {
    expect(realTexts).toHaveLength(4);
  });

  it.each(realTexts)('$project drops colour, fonts, sizes, classes and spans', ({ html }) => {
    const out = cleanTextHtml(html);
    expect(out).not.toMatch(/color|font-family|font-size|class=|<span|nofollow/i);
    for (const style of out.matchAll(/style="([^"]*)"/g)) {
      expect(style[1]).toMatch(/^text-align:(left|right|center|justify);?$/);
    }
    expect(out.length).toBeGreaterThan(0);
  });

  it.each(realTexts)('$project sanitizes to a fixed point', ({ html }) => {
    const once = sanitizeText(html);
    expect(sanitizeText(once)).toBe(once);
    const cleaned = cleanTextHtml(html);
    expect(sanitizeText(cleaned)).toBe(cleaned);
  });

  it('keeps the InstaBlogs href and adds target and rel', () => {
    const out = cleanTextHtml(textOf('176799549'));
    expect(out).toContain(
      '<a href="https://instablogs.vercel.app/" target="_blank" rel="noopener noreferrer">https://instablogs.vercel.app/</a>',
    );
    expect(out).toContain('Programador / Programmer: Bruno Martinez');
  });

  it('trims the trailing empty block from PuroV', () => {
    const out = cleanTextHtml(textOf('227934855'));
    expect(out).not.toMatch(/<br \/>\s*<\/div>$/);
    expect(out).toMatch(/^<div style="text-align:center">.*Figma<\/a><\/div>$/);
  });

  it('trims leading and trailing empty blocks repeatedly', () => {
    const html =
      '<p><br></p><div style="text-align:left;"><br></div><p>Body</p><div><br></div><p><br></p>';
    expect(cleanTextHtml(html)).toBe('<p>Body</p>');
  });

  it('keeps the text of attribute-less span wrappers', () => {
    expect(sanitizeText('<p><span><span>Hello</span> world</span></p>')).toBe('<p>Hello world</p>');
  });

  it('maps headings to paragraphs', () => {
    expect(sanitizeText('<h2>Title</h2>')).toBe('<p>Title</p>');
  });
});

describe('sanitizeText on XSS fixtures', () => {
  it.each(XSS_FIXTURES)('neutralizes %s', (html) => {
    const out = sanitizeText(html);
    expect(out).not.toMatch(/<(script|img|iframe|svg)/i);
    expect(out).not.toMatch(/on\w+=/i);
    expect(out).not.toMatch(/javascript:|data:|\/\/evil/i);
    expect(sanitizeText(out)).toBe(out);
  });

  it('unwraps disallowed links to their text', () => {
    expect(sanitizeText('<a href="javascript:alert(1)">x</a>')).toBe('x');
    expect(sanitizeText('<a href="//evil.com">x</a>')).toBe('x');
    expect(sanitizeText('<a href="data:text/html,hi">x</a>')).toBe('x');
  });

  it('keeps only text-align from styles', () => {
    expect(sanitizeText('<div style="background:url(javascript:alert(1))">x</div>')).toBe(
      '<div>x</div>',
    );
    expect(sanitizeText('<p style="color:red;text-align:right">x</p>')).toBe(
      '<p style="text-align:right">x</p>',
    );
  });

  it('keeps mailto links', () => {
    expect(sanitizeText('<a href="mailto:hi@example.com">mail</a>')).toBe(
      '<a href="mailto:hi@example.com" target="_blank" rel="noopener noreferrer">mail</a>',
    );
  });
});

describe('plainCaption', () => {
  it.each([
    ['<b>Bold</b> &amp; more<br>line two', 'Bold & more line two'],
    ['Tom & Jerry &lt;3 &gt; "quoted" &#39;single&#39;', 'Tom & Jerry <3 > "quoted" \'single\''],
    ['<p>First</p><p>second</p>', 'Firstsecond'],
    ['<script>alert(1)</script><img src=x onerror=alert(1)>safe', 'safe'],
    ['  spaced \n  out  ', 'spaced out'],
    ['', ''],
  ])('%j -> %j', (html, text) => {
    expect(plainCaption(html)).toBe(text);
  });
});

describe('extractEmbedSrc', () => {
  it('returns the decoded Portfolio-web Figma src', () => {
    const embed = modulesOf('202447185').find((entry) => entry.__typename === 'EmbedModule');
    const src = extractEmbedSrc(embed?.originalEmbed ?? '');
    expect(src).not.toBeNull();
    expect(src).not.toContain('&amp;');
    expect(
      src?.startsWith(
        'https://embed.figma.com/proto/l6Tt6mne6t9K2TjqphmvRE/portfolio-bruno?node-id=457-78&scaling=',
      ),
    ).toBe(true);
    expect(extractEmbedSrc(embed?.fluidEmbed ?? '')).toBe(src);
  });

  it('returns null without an iframe or with an unparsable src', () => {
    expect(extractEmbedSrc('<div>no frame</div>')).toBeNull();
    expect(extractEmbedSrc('')).toBeNull();
    expect(extractEmbedSrc('<iframe src="not a url"></iframe>')).toBeNull();
    expect(extractEmbedSrc('<iframe></iframe>')).toBeNull();
  });
});

describe('sanitize-html import guard', () => {
  it('is imported only by scripts/behance/sanitize.ts', () => {
    const root = join(import.meta.dirname, '..', '..');
    const importers: string[] = [];
    for (const dir of ['src', 'scripts']) {
      const entries = readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' });
      for (const entry of entries) {
        if (!/\.(ts|js|mjs|astro)$/.test(entry)) continue;
        const file = join(dir, entry);
        if (readFileSync(join(root, file), 'utf8').includes("from 'sanitize-html'")) {
          importers.push(file.split('\\').join('/'));
        }
      }
    }
    expect(importers).toEqual(['scripts/behance/sanitize.ts']);
  });
});
