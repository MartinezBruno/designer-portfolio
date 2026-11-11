// Minimal ambient type for the Workers runtime module `cloudflare:workers`.
// Why: @cloudflare/workers-types is not a dependency and the adapter ships no declaration, so
// `astro check` cannot resolve the import in src/actions/index.ts. The surface is kept minimal on
// purpose: bindings are `unknown` and narrowed at runtime (isSendEmailBinding), never cast.
declare module 'cloudflare:workers' {
  export const env: Readonly<Record<string, unknown>>;
}
