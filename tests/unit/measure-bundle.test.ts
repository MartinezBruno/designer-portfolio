import { describe, expect, it } from 'vitest';
import {
  collectEager,
  dynamicImports,
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
