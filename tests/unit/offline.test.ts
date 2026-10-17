import { describe, expect, it } from 'vitest';
import {
  findCdnReferences,
  guardMarker,
  isIpcConnect,
  readAttempts,
  readGuardRun,
  staleGuardLog,
} from '../../scripts/offline.ts';

describe('findCdnReferences', () => {
  it.each([
    [
      '<img src="https://mir-s3-cdn-cf.behance.net/x.png">',
      ['https://mir-s3-cdn-cf.behance.net/x.png'],
    ],
    [
      "<img src='https://mir-cdn.behance.net/v1/rendition/a.jpg'>",
      ['https://mir-cdn.behance.net/v1/rendition/a.jpg'],
    ],
    [
      '<img src="//mir-s3-cdn-cf.behance.net/projects/404/b.webp">',
      ['//mir-s3-cdn-cf.behance.net/projects/404/b.webp'],
    ],
    [
      '<div style="background:url(http://mir-cdn.behance.net/c.png)"></div>',
      ['http://mir-cdn.behance.net/c.png'],
    ],
  ])('finds the CDN url in %s', (html, expected) => {
    expect(findCdnReferences(html)).toEqual(expected);
  });

  it.each([
    '<a href="https://www.behance.net/martifernand7">Behance</a>',
    '<img src="/_astro/cover.abc123.webp">',
    '',
  ])('ignores %s', (html) => {
    expect(findCdnReferences(html)).toEqual([]);
  });

  it('returns every match in a document', () => {
    expect(
      findCdnReferences(
        '<img src="https://mir-s3-cdn-cf.behance.net/a.png"><img src="https://mir-cdn.behance.net/b.png">',
      ),
    ).toEqual(['https://mir-s3-cdn-cf.behance.net/a.png', 'https://mir-cdn.behance.net/b.png']);
  });
});

describe('readAttempts', () => {
  it('returns non-empty trimmed lines', () => {
    expect(readAttempts('fetch https://example.com\n\n  dns behance.net  \n')).toEqual([
      'fetch https://example.com',
      'dns behance.net',
    ]);
  });

  it('returns nothing for an empty log', () => {
    expect(readAttempts('')).toEqual([]);
  });

  it('skips # marker lines', () => {
    const start = guardMarker('start', '1-2', new Date('2026-10-17T10:00:00Z'));
    expect(readAttempts(`${start}\nconnect a.b:443\n# note\n`)).toEqual(['connect a.b:443']);
  });
});

describe('guard run markers', () => {
  const START = new Date('2026-10-17T10:00:00.000Z');
  const END = new Date('2026-10-17T10:01:00.000Z');
  const full = `${guardMarker('start', '42-7', START)}\n${guardMarker('end', '42-7', END)}\n`;
  const inside = Date.parse('2026-10-17T10:00:30.000Z');

  it('reads the run id, start and end of a log', () => {
    expect(readGuardRun(full)).toEqual({ runId: '42-7', start: START, end: END });
  });

  it('needs the start marker on the first line', () => {
    expect(readGuardRun('')).toBeNull();
    expect(readGuardRun(`fetch x\n${full}`)).toBeNull();
  });

  it('ignores an end marker from another run', () => {
    const other = `${guardMarker('start', '42-7', START)}\n${guardMarker('end', '9-9', END)}\n`;
    expect(readGuardRun(other)?.end).toBeNull();
  });

  it('accepts a dist/ built inside the guarded run', () => {
    expect(staleGuardLog(full, inside)).toBeNull();
  });

  it.each([
    ['an empty log', '', inside, /no start marker/],
    ['an unfinished run', `${guardMarker('start', '42-7', START)}\n`, inside, /did not finish/],
    ['a dist/ built after the run', full, Date.parse('2026-10-17T11:00:00.000Z'), /not produced/],
    ['a dist/ built before the run', full, Date.parse('2026-10-17T09:00:00.000Z'), /not produced/],
  ])('rejects %s', (_label, text, newest, message) => {
    expect(staleGuardLog(text, newest)).toMatch(message);
  });
});

describe('isIpcConnect', () => {
  it.each([[{ path: '/tmp/x.sock' }], ['/tmp/x.sock'], [[{ path: '/tmp/x.sock' }]]])(
    'treats %o as IPC',
    (first) => {
      expect(isIpcConnect(first)).toBe(true);
    },
  );

  it.each([[{ port: 443, host: 'a.b' }], [443], [[{ port: 443, host: 'a.b' }]], [[]]])(
    'treats %o as TCP',
    (first) => {
      expect(isIpcConnect(first)).toBe(false);
    },
  );
});
