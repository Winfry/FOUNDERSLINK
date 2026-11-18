// Builds the installable web app (PWA) into dist/, ready for any static
// host (Cloudflare Pages, Netlify, Vercel).
//
//   pnpm build:pwa                      the demo: demo accounts and data, no server
//   pnpm build:pwa https://api.example  the live app, talking to that backend
//
// The demo ignores the backend address in .env on purpose: that one is
// this computer's Wi-Fi address and means nothing to anyone else.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const api = process.argv[2] ?? '';
if (api && !api.startsWith('https://')) {
  console.error('The backend address must start with https:// (an installed app cannot call plain http).');
  process.exit(1);
}

const run = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--clear'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_API_URL: api },
});
if (run.status !== 0) process.exit(run.status ?? 1);

// Check what was built: installable, and pointing where it should.
const need = ['index.html', 'manifest.json', 'sw.js', 'icons/icon-192.png', 'icons/icon-512.png'];
const missing = need.filter((f) => !existsSync(join('dist', f)));
if (missing.length) {
  console.error('Missing from dist/:', missing.join(', '));
  process.exit(1);
}
const js = join('dist', '_expo', 'static', 'js', 'web');
const code = readdirSync(js).map((f) => readFileSync(join(js, f), 'utf8')).join('\n');
if (/https?:\/\/192\.168\.|https?:\/\/10\.\d+\.\d+\.\d+:\d+/.test(code)) {
  console.error('The build still points at a local network address. Not deploying this.');
  process.exit(1);
}
console.log(`\nPWA ready in dist/ (${api ? `live, backend ${api}` : 'demo, no server'}).`);
