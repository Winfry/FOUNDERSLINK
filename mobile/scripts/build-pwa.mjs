// Builds the installable web app (PWA) into dist/, ready for any static
// host (Cloudflare Pages, Netlify, Vercel).
//
//   pnpm build:pwa                      the demo: demo accounts and data, no server
//   pnpm build:pwa https://api.example  the live app, talking to that backend
//
// The demo ignores the backend address in .env on purpose: that one is
// this computer's Wi-Fi address and means nothing to anyone else.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
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

// Expo puts fonts and pictures from packages under paths like
// assets/node_modules/.pnpm/<package>/node_modules/... Static hosts skip
// folders named node_modules, and some uploads skip hidden folders such as
// .pnpm. Without its fonts the app waits forever on a blank page. So both
// are renamed, on disk and in every path that points to them.
const safe = (path) => path.replace(/(^|\/)node_modules(?=\/|$)/g, '$1nm').replace(/(^|\/)\.pnpm(?=\/|$)/g, '$1pnpm');
const renameDirs = (dir) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (!f.isDirectory()) continue;
    const p = join(dir, f.name);
    renameDirs(p);
    const to = safe(f.name);
    if (to !== f.name) renameSync(p, join(dir, to));
  }
};
renameDirs(join('dist', 'assets'));
const rewrite = (dir) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) rewrite(p);
    else if (/\.(js|html|json|css)$/.test(f.name)) {
      const s = readFileSync(p, 'utf8');
      const out = s.replace(/\/assets\/[^"'`\s)]+/g, safe);
      if (out !== s) writeFileSync(p, out);
    }
  }
};
rewrite('dist');

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
if (/\/assets\/[^"'`\s)]*(node_modules|\/\.pnpm)/.test(code)) {
  console.error('Some files still point into a node_modules or .pnpm folder, which hosts skip.');
  process.exit(1);
}
console.log(`\nPWA ready in dist/ (${api ? `live, backend ${api}` : 'demo, no server'}).`);
