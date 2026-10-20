/**
 * The live pose tolerances: `poseThresholds.json`, plus any runtime override.
 * Kept apart from the scorer so the session layer can read them without
 * pulling in the geometry.
 */
import defaults from './poseThresholds.json';


export interface CheckOverride {
  tol?: number;
  min?: number;
  max?: number;
  target?: number;
  weight?: number;
}

export interface PoseThresholds {
  passScore: number;
  angleToleranceDeg: number;
  distanceTolerance: number;
  minVisibility: number;
  minCoverage: number;
  minBlend: number;
  acceptMirrored: boolean;
  strictSides: boolean;
  window: { size: number; required: number; minSpanMs: number };
  maxHoldMs: number;
  holdDecay: number;
  hintAfterMs: number;
  stuckTimeoutMs: number;
  stuckAutoContinueMs: number;
  poses: Record<string, { passScore?: number; checks?: Record<string, CheckOverride> }>;
}

// `_doc` is the comment in the JSON; harmless to carry along.
const shipped = defaults as unknown as PoseThresholds;
let thresholds: PoseThresholds = shipped;

export function getPoseThresholds(): PoseThresholds {
  return thresholds;
}

/** Runtime override (tests, remote config, the dev debug view). Shallow per section. */
export function setPoseThresholds(patch: Partial<PoseThresholds>): void {
  thresholds = {
    ...thresholds,
    ...patch,
    window: { ...thresholds.window, ...(patch.window ?? {}) },
    poses: { ...thresholds.poses, ...(patch.poses ?? {}) },
  };
}

export function resetPoseThresholds(): void {
  thresholds = shipped;
}

