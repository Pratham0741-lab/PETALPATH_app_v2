#!/usr/bin/env node
/**
 * Fails if a production JS bundle still contains developer/testing tools.
 *
 *   node scripts/check-prod-bundle.mjs              # production build: none may be present
 *   node scripts/check-prod-bundle.mjs --dev-tools  # flag on: all must be present
 *
 * The second form proves the check is not vacuous: the same markers really are
 * in the bundle when EXPO_PUBLIC_ENABLE_DEV_TOOLS=true, so their absence in the
 * first form means the code was removed, not that the strings were renamed.
 *
 * Exports an Android bundle with `expo export` (plain JS, no Hermes bytecode, so
 * the text can be searched) into a temp folder and greps it.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEV_TOOLS = process.argv.includes('--dev-tools');

/** One marker per dev tool; each is a literal that only that tool renders or calls. */
const MARKERS = [
  ['Speak "Skip / Demo Mode"', 'Skip / Demo Mode'],
  ['Listen "Skip"', 'Moves on without answering'],
  ['Calibration "Skip Setup"', 'Saves what we have and returns to the activities'],
  ['Lesson "Mark Lesson Complete"', 'Mark Lesson Complete'],
  ['Camera engine DebugOverlay', 'Show camera engine metrics'],
  ['CameraActivity diagnostics screen', 'Live preview with engine diagnostics'],
  ['Pose debug view', 'POSE_DEBUG_VIEW'],
];

/** Dev-only server routes: no production code may call them. */
const ROUTES = ['/progress/dev/', '/progress/module/complete', '/progress/category/complete', '/curriculum/complete', '/unlock/'];

const out = mkdtempSync(path.join(tmpdir(), 'pp-bundle-'));
const env = {
  ...process.env,
  NODE_ENV: 'production',
  EXPO_PUBLIC_ENABLE_DEV_TOOLS: DEV_TOOLS ? 'true' : 'false',
  CI: '1',
};
console.log(`expo export (EXPO_PUBLIC_ENABLE_DEV_TOOLS=${env.EXPO_PUBLIC_ENABLE_DEV_TOOLS}) -> ${out}`);
const res = spawnSync(
  'npx',
  ['expo', 'export', '--platform', 'android', '--no-bytecode', '--output-dir', out, '--clear'],
  { cwd: ROOT, env, stdio: 'inherit', shell: process.platform === 'win32' },
);
if (res.status !== 0) {
  console.error('expo export failed');
  process.exit(res.status ?? 1);
}

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|hbc)$/.test(name)) files.push(p);
  }
};
walk(out);
const bundle = files.map((f) => readFileSync(f, 'latin1')).join('\n');
rmSync(out, { recursive: true, force: true });
if (bundle.length < 100_000) {
  console.error(`bundle looks empty (${bundle.length} bytes in ${files.length} files)`);
  process.exit(1);
}

const failures = [];
for (const [label, marker] of MARKERS) {
  const found = bundle.includes(marker);
  if (found !== DEV_TOOLS) failures.push(`${label}: "${marker}" ${found ? 'FOUND' : 'MISSING'}`);
}
if (!DEV_TOOLS) {
  for (const route of ROUTES) {
    if (bundle.includes(route)) failures.push(`dev-only route "${route}" FOUND`);
  }
}

if (failures.length) {
  console.error(`\n${DEV_TOOLS ? 'Dev-tools build is missing tools' : 'Production bundle contains dev tools'}:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  DEV_TOOLS
    ? `\n✓ all ${MARKERS.length} dev tools present with the flag on`
    : `\n✓ production bundle (${(bundle.length / 1e6).toFixed(1)} MB) contains none of ${MARKERS.length} dev tools or ${ROUTES.length} dev routes`,
);
