// Embed origin allowlist shared by the sync, the site build and the client facade. Node-safe and
// erasable TypeScript only (no Astro virtual-module imports): scripts/sync-behance.ts runs it with Node type
// stripping. An embed is accepted only from an exact https host listed here (D-07).

export const EMBED_PROVIDERS = {
  figma: { host: 'embed.figma.com', name: 'Figma' },
} as const;

export type EmbedProviderId = keyof typeof EMBED_PROVIDERS;

const PROVIDER_IDS = Object.keys(EMBED_PROVIDERS) as EmbedProviderId[];

/** The provider whose exact host serves `src` over https without credentials, or null. */
export function providerForUrl(src: string): EmbedProviderId | null {
  if (!URL.canParse(src)) return null;
  const url = new URL(src);
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') return null;
  return PROVIDER_IDS.find((id) => EMBED_PROVIDERS[id].host === url.hostname) ?? null;
}
