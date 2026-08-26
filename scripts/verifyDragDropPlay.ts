/**
 * Plays every shipped Match & Learn board through the real engine classes.
 *
 * The static audit in `verifyDragDropSpecs.ts` checks the *shape* of the data.
 * This checks the *outcome*: it imports the actual `PlacementManager`,
 * `ValidationSystem`, `ScoringSystem` and `StarRatingEvaluator` the app ships and
 * simulates a child playing each board perfectly, then asserts that the board
 * completes and awards three stars.
 *
 * It is worth doing separately because the star bug was invisible to inspection —
 * every field looked plausible (`basePointsPerItem: 10`, `maxScore: 100`,
 * thresholds at 0.4/0.7/0.9) and only the arithmetic across three files revealed
 * that a flawless run scored 30%.
 *
 * It also proves each drop *lands* where intended: the drop point is the zone's
 * geometric centre, run through the same collision code the gesture handler uses,
 * so a board whose zones sit close enough to steal each other's drops fails here.
 *
 * Compile and run from the repo root:
 *
 *   rm -rf scripts/.build && \
 *   frontend/node_modules/.bin/tsc --ignoreConfig --ignoreDeprecations 6.0 \
 *     --module commonjs --target es2020 --esModuleInterop --strict \
 *     --moduleResolution node --types node \
 *     --typeRoots ./backend/node_modules/@types --outDir scripts/.build \
 *     scripts/verifyDragDropPlay.ts && \
 *   node scripts/.build/scripts/verifyDragDropPlay.js
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlacementManager } from '../frontend/src/features/drag_drop/engine/PlacementManager';
import { ValidationSystem } from '../frontend/src/features/drag_drop/engine/ValidationSystem';
import { ScoringSystem } from '../frontend/src/features/drag_drop/engine/ScoringSystem';
import { StarRatingEvaluator } from '../frontend/src/features/drag_drop/engine/StarRatingEvaluator';
import type { DragDropActivitySpec } from '../frontend/src/features/drag_drop/types';

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
  throw new Error('Could not locate the repo root');
}

const SPEC_DIR = path.join(findRoot(), 'curriculum', 'activities', 'drag_drop');

const failures: string[] = [];

function play(file: string): { stars: number; pct: number } | null {
  const spec = JSON.parse(fs.readFileSync(path.join(SPEC_DIR, file), 'utf8')) as DragDropActivitySpec;

  const placementManager = new PlacementManager();
  const validation = new ValidationSystem();
  const scoring = new ScoringSystem();

  const placements: Record<string, string> = {};
  const used = new Set<string>();
  let correct = 0;

  // Fill the zones in a deliberately awkward order — last to first. A board that
  // only works when filled left to right is exactly the `ordered-sequence` trap
  // we are trying to stay out of, and it should fail here.
  const zones = [...spec.dropZones].reverse();

  for (const zone of zones) {
    const target = zone.acceptedDraggableIds.find((id) => !used.has(id));
    if (!target) {
      failures.push(`${file}: zone ${zone.id} has no unused accepted tile left — the board is unsolvable`);
      return null;
    }

    // Drop dead centre of the zone, through the real collision code.
    const dropPoint = {
      x: zone.shape.position.x + zone.shape.dimensions.width / 2,
      y: zone.shape.position.y + zone.shape.dimensions.height / 2,
    };
    const proposed = placementManager.findPlacementTarget(
      dropPoint,
      spec.dropZones,
      spec.interaction.snapping
    );

    if (proposed.dropZoneId !== zone.id) {
      failures.push(
        `${file}: a drop at the centre of ${zone.id} resolved to ${String(proposed.dropZoneId)} — zones are too close`
      );
      return null;
    }

    const result = validation.evaluateDrop(target, zone.id, spec.validation, spec.dropZones, placements);
    if (!result.isValid) {
      failures.push(`${file}: dropping ${target} on ${zone.id} was rejected, but the zone lists it as accepted`);
      return null;
    }

    placements[zone.id] = target;
    used.add(target);
    correct += 1;
  }

  const complete = validation.evaluateOverallCompletion(
    spec.draggables.length,
    placements,
    spec.dropZones,
    spec.validation
  );
  if (!complete) {
    failures.push(`${file}: every zone is filled correctly but the activity never reports completion`);
    return null;
  }

  const score = scoring.calculateScore(
    spec.draggables.length,
    correct,
    0,
    30_000,
    spec.validation.scoringModel
  );
  const stars = StarRatingEvaluator.evaluateStars(
    score.percentageScore,
    spec.validation.scoringModel.starThresholds
  );

  if (stars !== 3) {
    failures.push(
      `${file}: a flawless run earns ${String(stars)} star(s) at ${String(Math.round(score.percentageScore * 100))}%`
    );
  }

  return { stars, pct: score.percentageScore };
}

function main(): void {
  const files = fs.readdirSync(SPEC_DIR).filter((f) => f.endsWith('.json')).sort();
  let threeStars = 0;

  for (const file of files) {
    const outcome = play(file);
    if (outcome && outcome.stars === 3) threeStars += 1;
  }

  console.log(`played ${String(files.length)} board(s) through the real engine`);
  console.log(`${String(threeStars)}/${String(files.length)} award three stars for a flawless run`);

  if (failures.length > 0) {
    console.log(`\n${String(failures.length)} FAILURE(S):`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log('all boards complete and score correctly');
}

main();
