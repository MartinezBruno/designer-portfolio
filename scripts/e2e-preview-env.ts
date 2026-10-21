// E2E preview env: run after `astro build`, before `astro preview` (playwright webServer).
// astro preview reads secrets only from dist/server/.dev.vars (the Cloudflare plugin's copy of the
// developer's own .dev.vars), and process env cannot override file values (05-RESEARCH Pitfall 3).
// Overwriting the copy with fixed values means e2e never uses real keys or sends real email:
// the console mailer and Cloudflare's always-pass Turnstile test secret.
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SERVER_DIR = join('dist', 'server');
const ENV_LINES = [
  'MAILER=console',
  'TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA',
  'CONTACT_TO=inbox@example.invalid',
];

if (!existsSync(SERVER_DIR)) {
  console.error('dist/server/ not found — run pnpm build first');
  process.exit(1);
}

writeFileSync(join(SERVER_DIR, '.dev.vars'), `${ENV_LINES.join('\n')}\n`);
console.log('e2e preview env written (MAILER=console)');
