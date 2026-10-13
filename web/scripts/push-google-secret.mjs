// Copies AUTH_GOOGLE_SECRET from .env.local to Vercel production without echoing it or adding a trailing newline.
// Usage (from web/): node scripts/push-google-secret.mjs
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// `vercel env pull` rewrites values as KEY="value", so strip optional quotes
const secret = readFileSync('.env.local', 'utf8').match(/^AUTH_GOOGLE_SECRET=(.+)$/m)?.[1]?.trim().replace(/^"(.*)"$/, '$1');
if (!secret) {
  console.error('AUTH_GOOGLE_SECRET not found in .env.local');
  process.exit(1);
}
const r = spawnSync('npx', ['vercel', 'env', 'add', 'AUTH_GOOGLE_SECRET', 'production', '--force', '--sensitive'],
  { input: secret, shell: true, encoding: 'utf8' });
console.log((r.stdout + r.stderr).split('\n').find((l) => /Added|Overrode|Error/.test(l))?.trim() || `exit ${r.status}`);
