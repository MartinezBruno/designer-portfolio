import { describe, expect, it } from 'vitest';
import {
  checkEagerCeiling,
  collectEager,
  dynamicImports,
  findEagerMarkers,
  pagesFromHtmlFiles,
  parseEntryScripts,
  staticImports,
} from '../../scripts/bundle.ts';

describe('parseEntryScripts', () => {
  it('returns the src of every module script, in either attribute order', () => {
    const html =
      '<head><script type="module" src="/_astro/a.js"></script>' +
      '<script src="/_astro/b.js" type="module"></script></head>';
    expect(parseEntryScripts(html)).toEqual(['/_astro/a.js', '/_astro/b.js']);
  });

  it('ignores inline scripts and classic scripts', () => {
    const html =
      '<script type="module">import "./x.js"</script>' +
      '<script>document.documentElement.dataset.motion = "on"</script>' +
      '<script src="/classic.js"></script>' +
      "<script type='module' src='/_astro/c.js'></script>";
    expect(parseEntryScripts(html)).toEqual(['/_astro/c.js']);
  });
});

describe('staticImports', () => {
  it('returns minified static import and re-export specifiers', () => {
    const js =
      'import{a as b}from"./x.js";import"./y.js";export{c}from"./z.js";' +
      'import*as d from"./w.js";const l=()=>import("./lazy.js");';
    expect(staticImports(js)).toEqual(['./x.js', './y.js', './z.js', './w.js']);
  });

  it('excludes dynamic imports', () => {
    expect(staticImports('import("./lazy.js").then(m=>m)')).toEqual([]);
  });
});

describe('dynamicImports', () => {
  it('returns only dynamic import specifiers', () => {
    const js = 'import{a}from"./x.js";const l=()=>import("./lazy.js");import(`./tpl.js`)';
    expect(dynamicImports(js)).toEqual(['./lazy.js', './tpl.js']);
  });
});

describe('collectEager', () => {
  const files: Record<string, string> = {
    '/_astro/entry.js': 'import{m}from"./motion.js";const g=()=>import("./gsap.js");',
    '/_astro/motion.js': 'import"./entry.js";export const m=1;',
    '/_astro/gsap.js': 'import"./split.js";/* GreenSock */',
    '/_astro/split.js': 'import{m}from"./motion.js";export const s=1;',
    '/_astro/other.js': 'import"gsap";export{}',
  };
  const readFile = (path: string): string => {
    const content = files[path];
    if (content === undefined) throw new Error(`missing ${path}`);
    return content;
  };

  it('follows static imports recursively and terminates on cycles', () => {
    const { eager } = collectEager(['/_astro/entry.js'], readFile);
    expect(eager).toEqual(['/_astro/entry.js', '/_astro/motion.js']);
  });

  it('collects dynamic targets and their static deps as lazy, excluding eager files', () => {
    const { lazy } = collectEager(['/_astro/entry.js'], readFile);
    expect(lazy).toEqual(['/_astro/gsap.js', '/_astro/split.js']);
  });

  it('ignores bare specifiers', () => {
    const { eager, lazy } = collectEager(['/_astro/other.js'], readFile);
    expect(eager).toEqual(['/_astro/other.js']);
    expect(lazy).toEqual([]);
  });

  it('deduplicates shared entries', () => {
    const { eager } = collectEager(['/_astro/entry.js', '/_astro/motion.js'], readFile);
    expect(eager).toEqual(['/_astro/entry.js', '/_astro/motion.js']);
  });
});

describe('findEagerMarkers', () => {
  const markers = [
    { name: 'gsap', marker: 'GreenSock' },
    { name: 'lenis', marker: 'lenisVersion' },
  ] as const;

  it('reports a chunk containing lenisVersion as lenis', () => {
    const problems = findEagerMarkers(
      [{ path: '/_astro/scroll.js', text: 'const v={lenisVersion:"1.3.27"};' }],
      markers,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('lenis');
    expect(problems[0]).toContain('/_astro/scroll.js');
    expect(problems[0]).toContain('lenisVersion');
  });

  it('reports a chunk containing GreenSock as gsap', () => {
    const problems = findEagerMarkers(
      [{ path: '/_astro/gsap.js', text: '/* GreenSock */' }],
      markers,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('gsap');
    expect(problems[0]).toContain('/_astro/gsap.js');
  });

  it('reports one problem per file and marker hit', () => {
    const problems = findEagerMarkers(
      [
        { path: '/_astro/both.js', text: 'GreenSock lenisVersion' },
        { path: '/_astro/clean.js', text: 'export const a=1;' },
      ],
      markers,
    );
    expect(problems).toHaveLength(2);
  });

  it('returns nothing for clean files', () => {
    expect(findEagerMarkers([{ path: '/_astro/a.js', text: 'export{}' }], markers)).toEqual([]);
  });
});

describe('checkEagerCeiling', () => {
  it('reports a total over the ceiling', () => {
    const problem = checkEagerCeiling('/', 22_001, 22_000);
    expect(problem).toBeDefined();
    expect(problem).toContain('/');
    expect(problem).toContain('22001');
    expect(problem).toContain('22000');
  });

  it('accepts a total equal to the ceiling', () => {
    expect(checkEagerCeiling('/', 22_000, 22_000)).toBeUndefined();
  });

  it('accepts a total under the ceiling', () => {
    expect(checkEagerCeiling('/es/', 14_643, 22_000)).toBeUndefined();
  });
});

describe('pagesFromHtmlFiles', () => {
  const files = [
    'index.html',
    'es/index.html',
    'projects/index.html',
    'projects/website-instablogs/index.html',
    'es/projects/index.html',
    '404.html',
  ];

  it('maps index.html to its directory route and other files to their path', () => {
    expect(pagesFromHtmlFiles(files)).toEqual([
      { route: '/', html: 'index.html' },
      { route: '/404.html', html: '404.html' },
      { route: '/es/', html: 'es/index.html' },
      { route: '/es/projects/', html: 'es/projects/index.html' },
      { route: '/projects/', html: 'projects/index.html' },
      {
        route: '/projects/website-instablogs/',
        html: 'projects/website-instablogs/index.html',
      },
    ]);
  });

  it('returns the same order for any input order', () => {
    expect(pagesFromHtmlFiles([...files].reverse())).toEqual(pagesFromHtmlFiles(files));
  });

  it('normalises Windows separators', () => {
    expect(pagesFromHtmlFiles(['projects\\a\\index.html'])).toEqual([
      { route: '/projects/a/', html: 'projects/a/index.html' },
    ]);
  });

  it('ignores non-HTML paths', () => {
    expect(pagesFromHtmlFiles(['_astro/a.js', 'favicon.svg', 'es', 'sitemap.xml'])).toEqual([]);
  });

  it('returns an empty list for no input', () => {
    expect(pagesFromHtmlFiles([])).toEqual([]);
  });
});
