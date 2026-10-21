// Astro Actions entry. Plan 05-04 adds the `contact` action here.
// Even empty, this module makes Astro emit the on-demand Worker for /_actions/*, so the
// Cloudflare preview serves misses through Astro (localized 404s) instead of a bare
// assets-only 404 with an empty body.
export const server = {};
