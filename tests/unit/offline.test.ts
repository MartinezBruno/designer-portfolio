import { describe, expect, it } from 'vitest';
import { findCdnReferences, isIpcConnect, readAttempts } from '../../scripts/offline.ts';

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
