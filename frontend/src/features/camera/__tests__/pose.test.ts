/**
 * Tolerant pose detection, on synthetic landmarks.
 *
 *   npm run test:pose
 *
 * For every config-scored pose: correct, sloppy (~20° off) and half-visible
 * versions must pass; a clearly wrong pose must be rejected. Plus mirroring,
 * body-size normalisation, jitter, the rolling window, and the 30 s move-on.
 */
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { POSE_CASES } from './poseCases';
import { ARMS_DOWN, skeleton, type SkeletonSpec } from './poseFixtures';
import { POSE_CONFIGS } from '../pose/poseConfig';
import { resetPoseThresholds, scorePose, setPoseThresholds, getPoseThresholds } from '../pose/poseScorer';
import { PoseWindow } from '../pose/PoseWindow';
import { setPoseMirrored } from '../validators/primitives';
import { ActivitySessionEngine } from '../session/ActivitySessionEngine';
import type { ActivityDefinition } from '../session/activityDefinitions';
import type { ActivityEngineResult, PoseFrame } from '../types/pose.types';

// Fixtures label limbs as the child's own sides; that is an unmirrored camera.
setPoseMirrored(false);
afterEach(() => {
  resetPoseThresholds();
  setPoseMirrored(false);
});

const score = (validator: string, spec: SkeletonSpec | PoseFrame) =>
  scorePose(validator, 'landmarks' in spec ? spec : skeleton(spec))!;

/** Swap the image left/right: what a mirrored camera (or a mirroring child) produces. */
function mirrorFrame(f: PoseFrame): PoseFrame {
  const out: Record<string, unknown> = {};
  for (const [k, p] of Object.entries(f.landmarks)) {
    if (k === 'rawLandmarks') continue;
    const twin = k.startsWith('left') ? 'right' + k.slice(4) : k.startsWith('right') ? 'left' + k.slice(5) : k;
    const pt = p as { x: number; y: number; z: number; visibility?: number };
    out[twin] = { ...pt, x: 1 - pt.x };
  }
  return { ...f, landmarks: { ...(out as any), rawLandmarks: [] } };
}

/** Deterministic landmark noise of up to ±amp. */
function jitter(f: PoseFrame, amp: number, seed: number): PoseFrame {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280) * 2 - 1;
  const out: Record<string, unknown> = {};
  for (const [k, p] of Object.entries(f.landmarks)) {
    if (k === 'rawLandmarks') continue;
    const pt = p as { x: number; y: number; z: number; visibility?: number };
    out[k] = { ...pt, x: pt.x + rnd() * amp, y: pt.y + rnd() * amp };
  }
  return { ...f, landmarks: { ...(out as any), rawLandmarks: [] } };
}

describe('pose configs', () => {
  it('every config has test cases', () => {
    const covered = new Set(POSE_CASES.map((c) => c.validator));
    assert.deepEqual(Object.keys(POSE_CONFIGS).filter((k) => !covered.has(k)), []);
  });
});

for (const c of POSE_CASES) {
  describe(c.validator, () => {
    for (const kind of ['correct', 'sloppy', 'halfVisible'] as const) {
      it(`passes ${kind}`, () => {
        const s = score(c.validator, c[kind]);
        assert.ok(s.pass, `${kind} scored ${s.score.toFixed(2)}, failing ${s.failing?.id}`);
      });
    }
    it('rejects a clearly wrong pose', () => {
      const s = score(c.validator, c.wrong);
      assert.ok(!s.pass, `wrong pose scored ${s.score.toFixed(2)}`);
      assert.ok(s.hint, 'a rejected pose says what to fix');
    });
    if (POSE_CONFIGS[c.validator].sideSpecific) {
      it('rejects the mirrored pose (wrong side)', () => {
        const s = score(c.validator, mirrorFrame(skeleton(c.correct)));
        assert.ok(!s.pass, `other hand scored ${s.score.toFixed(2)}`);
        assert.match(s.hint ?? '', /LEFT|RIGHT/);
      });
    } else {
      it('accepts the mirrored pose', () => {
        assert.ok(score(c.validator, mirrorFrame(skeleton(c.correct))).pass);
      });
    }
    it('is the same near and far from the camera', () => {
      for (const torso of [0.14, 0.4]) {
        const s = score(c.validator, { ...c.correct, torso, cx: 0.45, shoulderY: torso > 0.3 ? 0.5 : 0.25 });
        assert.ok(s.pass, `torso ${torso}: ${s.score.toFixed(2)}`);
      }
    });
    it('tolerates landmark jitter', () => {
      for (let seed = 1; seed <= 5; seed++) {
        const s = score(c.validator, jitter(skeleton(c.correct), 0.01, seed));
        assert.ok(s.pass, `seed ${seed}: ${s.score.toFixed(2)}`);
      }
    });
  });
}

describe('commonly confused poses stay apart', () => {
  it('arms out wide is not hands up', () => {
    const tPose = { leftArm: { upper: 180, lower: 180 }, rightArm: { upper: 0, lower: 0 } };
    assert.ok(!score('areHandsAboveShoulders', tPose).pass);
    assert.ok(!score('areBothHandsAboveShoulders', tPose).pass);
  });
  it('one hand up is not both hands up', () => {
    assert.ok(!score('areBothHandsAboveShoulders', { ...ARMS_DOWN, leftArm: { upper: -100, lower: -95 } }).pass);
  });
  it('arms hanging by the sides is not hands on hips', () => {
    const s = score('areHandsNearHips', ARMS_DOWN);
    assert.ok(!s.pass);
    assert.match(s.failing!.id, /ElbowBent/);
  });
  it('standing is not squatting', () => {
    assert.ok(!score('isSquatting', ARMS_DOWN).pass);
  });
  it('hands out in front, apart, is not a clap', () => {
    const fwd = { leftArm: { upper: 80, lower: 80 }, rightArm: { upper: 100, lower: 100 }, armLength: 0.4 };
    assert.ok(!score('areHandsTouching', fwd).pass);
  });
});

describe('thresholds are configuration', () => {
  it('pass mark comes from poseThresholds.json', () => {
    assert.equal(getPoseThresholds().passScore, 0.6);
  });
  it('a global override changes the outcome', () => {
    const c = POSE_CASES.find((x) => x.validator === 'isHandNearTorso')!;
    assert.ok(score(c.validator, c.halfVisible).pass);
    setPoseThresholds({ passScore: 0.95 });
    assert.ok(!score(c.validator, c.halfVisible).pass);
  });
  it('a per-pose, per-check override changes the outcome', () => {
    const c = POSE_CASES.find((x) => x.validator === 'areHandsNearHips')!;
    assert.ok(score(c.validator, c.correct).pass);
    setPoseThresholds({ poses: { areHandsNearHips: { checks: { leftElbowBent: { target: 175, tol: 5 }, rightElbowBent: { target: 175, tol: 5 } } } } });
    assert.ok(!score(c.validator, c.correct).pass);
  });
  it('side-specific poses can be relaxed with strictSides: false', () => {
    const c = POSE_CASES.find((x) => x.validator === 'isLeftHandRaised')!;
    const mirrored = mirrorFrame(skeleton(c.correct));
    assert.ok(!score(c.validator, mirrored).pass);
    setPoseThresholds({ strictSides: false });
    assert.ok(score(c.validator, mirrored).pass);
  });
});

describe("left and right are the child's own", () => {
  const leftUp = { ...ARMS_DOWN, leftArm: { upper: -100, lower: -95 } };
  it('the left hand passes "left" and fails "right"', () => {
    assert.ok(score('isLeftHandRaised', leftUp).pass);
    assert.ok(!score('isRightHandRaised', leftUp).pass);
  });
  it('follows the front camera mirroring the image', () => {
    // A mirrored front camera labels the child's left wrist as rightWrist.
    const asSeen = mirrorFrame(skeleton(leftUp));
    setPoseMirrored(true);
    assert.ok(score('isLeftHandRaised', asSeen).pass);
    assert.ok(!score('isRightHandRaised', asSeen).pass);
  });
});

// ---------------------------------------------------------------------------
// Rolling window and session
// ---------------------------------------------------------------------------

describe('rolling window (8 of the last 12 frames)', () => {
  const cfg = { size: 12, required: 8, minSpanMs: 500 };
  const feed = (pattern: boolean[], fps: number) => {
    const w = new PoseWindow(cfg);
    const passing: boolean[] = [];
    pattern.forEach((hit, i) => {
      w.push(hit, (i * 1000) / fps);
      passing.push(w.isPassing());
    });
    return passing;
  };
  it('passes with occasional misses', () => {
    const p = Array.from({ length: 24 }, (_, i) => i % 4 !== 3); // 75% hits
    assert.ok(feed(p, 20).some(Boolean));
  });
  it('does not pass on scattered hits', () => {
    const p = Array.from({ length: 60 }, (_, i) => i % 2 === 0); // 50% hits
    assert.ok(!feed(p, 20).some(Boolean));
  });
  it('needs at least ~0.5 s even at a high frame rate', () => {
    const passing = feed(Array(30).fill(true), 60);
    const first = passing.indexOf(true);
    assert.ok(first >= 0 && (first * 1000) / 60 >= 450, `first pass at frame ${first}`);
  });
});

describe('session engine', () => {
  const def: ActivityDefinition = {
    id: 'raise_hands',
    primitive: 'areBothHandsAboveShoulders',
    holdDurationMs: 1500,
    repetitions: 1,
    timeoutMs: 30000,
    confidenceThreshold: 0.6,
  };
  const frame = (hit: boolean): ActivityEngineResult => ({
    activityType: 'raise_hands',
    state: hit ? 'detected' : 'searching',
    confidence: hit ? 0.8 : 0,
    feedback: '',
    hint: 'Lift your hand up high!',
  });
  const running = (d: ActivityDefinition = def) => {
    const e = new ActivitySessionEngine();
    e.startSession(d, 1);
    e.tickCountdown();
    return e;
  };

  it('completes a wobbly hold within 1.5 s', () => {
    const e = running();
    let t = 1_000_000;
    let ms = 0;
    for (let i = 0; i < 200 && e.getSnapshot().state === 'running'; i++) {
      t += 50; // 20 fps
      ms += 50;
      e.evaluateFrame(frame(i % 4 !== 3), t); // one frame in four lost
    }
    assert.equal(e.getSnapshot().state, 'completed');
    assert.ok(ms <= 1500, `took ${ms} ms`);
  });

  it('does not complete on a pose that is mostly wrong', () => {
    const e = running();
    let t = 1_000_000;
    for (let i = 0; i < 400; i++) e.evaluateFrame(frame(i % 3 === 0), (t += 50));
    assert.notEqual(e.getSnapshot().state, 'completed');
  });

  it('shows a hint after 10 s and moves on (not a pass) after 30 s', () => {
    const e = running();
    let t = 1_000_000;
    let hintAt = -1;
    for (let ms = 0; ms <= 31_000 && e.getSnapshot().state === 'running'; ms += 100) {
      e.evaluateFrame(frame(false), (t += 100));
      if (hintAt < 0 && e.getSnapshot().showHint) hintAt = ms;
    }
    assert.ok(hintAt >= 9_900 && hintAt <= 10_200, `hint at ${hintAt}`);
    assert.equal(e.getSnapshot().state, 'timed_out');
    assert.equal(e.getSnapshot().currentReps, 0);
  });

  it('restarts the 30 s timer on every rep', () => {
    const e = running({ ...def, repetitions: 2 });
    let t = 1_000_000;
    for (let ms = 0; ms < 25_000; ms += 100) e.evaluateFrame(frame(false), (t += 100));
    for (let i = 0; i < 40 && e.getSnapshot().currentReps < 1; i++) e.evaluateFrame(frame(true), (t += 50));
    assert.equal(e.getSnapshot().currentReps, 1);
    for (let ms = 0; ms < 25_000; ms += 100) e.evaluateFrame(frame(false), (t += 100));
    assert.equal(e.getSnapshot().state, 'running', '25 s after a rep is not stuck yet');
  });
});
