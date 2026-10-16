# Designer Portfolio — Martina Fernandez

Bilingual (English at `/`, Spanish at `/es/`), motion-rich portfolio for graphic designer Martina Fernandez, built with Astro 7, TypeScript (strictest) and Tailwind CSS 4.

## Requirements

- Node.js `>=22.22.0` (`.nvmrc` pins `24.22.0`)
- pnpm

```sh
pnpm install
pnpm exec playwright install chromium
```

## Scripts

| Command              | What it does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`           | Start the dev server at `http://localhost:4321`                        |
| `pnpm build`         | Build the static site into `dist/`                                     |
| `pnpm preview`       | Serve the built `dist/` locally                                        |
| `pnpm check`         | Type-check `.astro` and `.ts` files (`astro check`)                    |
| `pnpm lint`          | `astro check` + ESLint + Prettier check                                |
| `pnpm format`        | Format everything with Prettier                                        |
| `pnpm test`          | Unit tests (Vitest)                                                    |
| `pnpm test:e2e`      | Build, then run Playwright + axe against `astro preview`               |
| `pnpm check:secrets` | Fail if secret files are tracked in git or present in `dist/`          |
| `pnpm verify`        | All gates: `lint`, `test`, `test:e2e`, `check:secrets`                 |

## Run the full stack locally

```sh
pnpm verify
pnpm preview
```

## Constraints

- Playwright webServer must run astro preview with --ignore-lock (Astro 7 backgrounds `astro preview` when it detects an agent, which makes Playwright's webServer exit early).
- Run servers manually as an agent with `pnpm astro dev --background` / `pnpm astro dev stop`.
- Secret files (`.env`, `.env.*`, `.dev.vars`, `.dev.vars.*`) are git-ignored; only `.env.example` may be committed.
