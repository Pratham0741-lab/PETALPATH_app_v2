/**
 * Regenerates every shipped Match & Learn spec from the blueprint table.
 *
 * The 43 files under `curriculum/activities/drag_drop/` take priority over the
 * runtime generator — `activities.service.ts` reads the manifest first and only
 * falls back to `generateDynamicDragDropSpec`. So fixing the generator alone
 * changes nothing for the lessons that actually ship; the files have to be
 * rewritten too. That is what this script is for.
 *
 * Compile and run from the repo root:
 *
 *   rm -rf scripts/.build && \
 *   backend/node_modules/.bin/tsc --ignoreConfig --ignoreDeprecations 6.0 \
 *     --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --strict --types node \
 *     --typeRoots ./backend/node_modules/@types --outDir scripts/.build \
 *     scripts/generateDragDropSpecs.ts && \
 *   node scripts/.build/scripts/generateDragDropSpecs.js
 *
 * Pass `--dry` to print the plan without touching any file.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  generateDynamicDragDropSpec,
  hasBlueprint,
} from '../backend/src/shared/utils/spec-generator.js';

/**
 * Walks up from wherever the compiled script landed until it finds the manifest.
 * The emitted layout depends on which files tsc happened to include — the output
 * sits at `scripts/.build/scripts/` today — so counting `..` segments is a
 * standing bug waiting to happen.
 */
function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'curriculum', 'activities', 'drag_drop_manifest.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not locate the repo root (no curriculum/activities/drag_drop_manifest.json above this script)');
}

const ROOT = findRoot();
const MANIFEST = path.join(ROOT, 'curriculum', 'activities', 'drag_drop_manifest.json');
const SPEC_DIR = path.join(ROOT, 'curriculum', 'activities', 'drag_drop');
const CURRICULUM_DIR = path.join(ROOT, 'curriculum', 'cbse');

/**
 * Date, not a timestamp, so that re-running the generator on the same day is a
 * no-op in git rather than 43 modified files.
 */
const GENERATED_AT = new Date().toISOString().slice(0, 10);

interface NodeInfo {
  title: string;
  topic?: string;
}

function collectNodes(): Map<string, NodeInfo> {
  const out = new Map<string, NodeInfo>();
  for (const file of fs.readdirSync(CURRICULUM_DIR).filter((f) => f.endsWith('.json'))) {
    const data: unknown = JSON.parse(fs.readFileSync(path.join(CURRICULUM_DIR, file), 'utf8'));
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (value && typeof value === 'object') {
        const obj = value as Record<string, any>;
        if (typeof obj.id === 'string' && typeof obj.title === 'string') {
          out.set(obj.id, {
            title: obj.title,
            topic: obj.curriculum?.original_topic,
          });
        }
        Object.values(obj).forEach(walk);
      }
    };
    walk(data);
  }
  return out;
}

function main(): void {
  const dry = process.argv.includes('--dry');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as {
    activities: Array<{ nodeId: string; activityIndex: number; fileName: string }>;
  };
  const nodes = collectNodes();

  let written = 0;
  let derived = 0;
  const missingNode: string[] = [];

  for (const entry of manifest.activities) {
    const node = nodes.get(entry.nodeId);
    if (!node) missingNode.push(entry.nodeId);

    const spec = generateDynamicDragDropSpec(
      entry.nodeId,
      node?.title ?? entry.nodeId,
      node?.topic,
      { activityIndex: entry.activityIndex, generatedAt: GENERATED_AT }
    );

    const authored = hasBlueprint(entry.nodeId);
    if (!authored) derived += 1;

    const target = path.join(SPEC_DIR, entry.fileName);
    const json = `${JSON.stringify(spec, null, 2)}\n`;

    const slots = (spec.dropZones as unknown[]).length;
    const tiles = (spec.draggables as unknown[]).length;
    console.log(
      `${authored ? ' ' : '~'} ${entry.fileName.padEnd(34)} ${String(slots)} slots, ` +
        `${String(tiles)} tiles  ${authored ? '' : '(derived fallback)'}`
    );

    if (!dry) {
      fs.writeFileSync(target, json, 'utf8');
      written += 1;
    }
  }

  console.log('');
  console.log(`${dry ? 'planned' : 'wrote'} ${String(dry ? manifest.activities.length : written)} spec file(s)`);
  if (derived > 0) {
    console.log(`${String(derived)} used the derived fallback — add a blueprint for these`);
  }
  if (missingNode.length > 0) {
    console.log(`no curriculum node found for: ${missingNode.join(', ')}`);
  }
}

main();
