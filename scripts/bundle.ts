// Pure helpers for the bundle measurement (scripts/measure-bundle.ts). Erasable TypeScript only
// (Node type stripping runs it). Paths are site paths such as `/_astro/motion.abc.js`.
import { posix } from 'node:path';

const SCRIPT_TAG = /<script\b([^>]*)>/gi;
const TYPE_MODULE = /\btype\s*=\s*["']?module["']?/i;
const SRC_ATTR = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

// `import"./a.js"`, `import{a as b}from"./a.js"`, `import*as c from"./a.js"`, `export{d}from"./a.js"`.
// `import(` never matches: the bare form needs a quote right after `import`, the `from` form stops at `(`.
const STATIC_IMPORT =
  /\b(?:import|export)(?:\s*["']([^"']+)["']|[^"'();]*?\bfrom\s*["']([^"']+)["'])/g;
const DYNAMIC_IMPORT = /\bimport\(\s*(["'`])([^"'`]+)\1\s*\)/g;

export function parseEntryScripts(html: string): string[] {
  const sources: string[] = [];
  for (const match of html.matchAll(SCRIPT_TAG)) {
    const attributes = match[1] ?? '';
    if (!TYPE_MODULE.test(attributes)) continue;
    const src = SRC_ATTR.exec(attributes);
    const value = src?.[1] ?? src?.[2] ?? src?.[3];
    if (value !== undefined && value !== '') sources.push(value);
  }
  return sources;
}

export function staticImports(js: string): string[] {
  return [...js.matchAll(STATIC_IMPORT)].flatMap((match) => {
    const specifier = match[1] ?? match[2];
    return specifier === undefined ? [] : [specifier];
  });
}

export function dynamicImports(js: string): string[] {
  return [...js.matchAll(DYNAMIC_IMPORT)].flatMap((match) =>
    match[2] === undefined ? [] : [match[2]],
  );
}

function resolve(from: string, specifier: string): string | undefined {
  if (specifier.startsWith('/')) return posix.normalize(specifier);
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return posix.join(posix.dirname(from), specifier);
  }
  return undefined; // bare specifier: not a file in the build output
}

function resolveAll(from: string, specifiers: string[]): string[] {
  return specifiers.flatMap((specifier) => {
    const resolved = resolve(from, specifier);
    return resolved === undefined ? [] : [resolved];
  });
}

export interface BundleGraph {
  eager: string[];
  lazy: string[];
}

// Eager = entries plus everything reachable through static imports (the browser fetches these on load).
// Lazy = dynamic-import targets, plus everything they reach, that are not already eager.
export function collectEager(entries: string[], readFile: (path: string) => string): BundleGraph {
  const eager = new Set<string>();
  const pendingLazy: string[] = [];

  const visitEager = (path: string): void => {
    if (eager.has(path)) return;
    eager.add(path);
    const js = readFile(path);
    pendingLazy.push(...resolveAll(path, dynamicImports(js)));
    for (const next of resolveAll(path, staticImports(js))) visitEager(next);
  };
  for (const entry of entries) visitEager(entry);

  const lazy = new Set<string>();
  const visitLazy = (path: string): void => {
    if (eager.has(path) || lazy.has(path)) return;
    lazy.add(path);
    const js = readFile(path);
    for (const next of resolveAll(path, [...staticImports(js), ...dynamicImports(js)])) {
      visitLazy(next);
    }
  };
  for (const path of pendingLazy) visitLazy(path);

  return { eager: [...eager], lazy: [...lazy] };
}

export interface BundleFile {
  path: string;
  text: string;
}

export interface BundleMarker {
  name: string;
  marker: string;
}

// One problem per (file, marker) hit: a library that must stay lazy shows up in an eager chunk.
export function findEagerMarkers(
  files: readonly BundleFile[],
  markers: readonly BundleMarker[],
): string[] {
  return files.flatMap((file) =>
    markers
      .filter((entry) => file.text.includes(entry.marker))
      .map((entry) => `${entry.name} loads eagerly: ${file.path} contains "${entry.marker}"`),
  );
}

// A problem only when the page's eager gzip total is strictly over the ceiling.
export function checkEagerCeiling(
  route: string,
  gzipTotal: number,
  ceiling: number,
): string | undefined {
  if (gzipTotal <= ceiling) return undefined;
  return `eager JS on ${route} is ${gzipTotal} B gzip -9, over the ${ceiling} B ceiling (+${gzipTotal - ceiling} B)`;
}

export interface MeasuredPage {
  route: string;
  html: string;
}

// Built HTML files (relative to dist/client) to measured pages: `es/projects/index.html` is
// `/es/projects/`, any other file is its own path (`404.html` is `/404.html`). Sorted by route.
export function pagesFromHtmlFiles(paths: readonly string[]): MeasuredPage[] {
  return paths
    .map((path) => path.replaceAll('\\', '/'))
    .filter((html) => html.endsWith('.html'))
    .map((html) => {
      if (html === 'index.html') return { route: '/', html };
      if (html.endsWith('/index.html')) {
        return { route: `/${html.slice(0, -'index.html'.length)}`, html };
      }
      return { route: `/${html}`, html };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
}
