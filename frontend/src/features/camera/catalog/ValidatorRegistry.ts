/**
 * Maps catalog `validatorName` strings onto pose primitives.
 *
 * The catalog (`activities.generated.json`) references validators by name, and
 * `scripts/generateCatalog.ts` refuses to emit an activity whose validator is not
 * registered here — so this file and the generator's `REGISTERED_VALIDATORS` set
 * must stay in step.
 *
 * Static validators only need the current frame. Temporal ones (waving, jumping,
 * marching, nodding, holding still) need the recent history window; they are
 * given it, and fall back to a single-frame window when none is available, which
 * makes them report "not yet" rather than firing on no evidence.
 */

import { PoseFrame, ValidationResult } from '../types/pose.types';
import {
  // Static — hands relative to the body
  areHandsAboveShoulders,
  areBothHandsAboveShoulders,
  isLeftHandRaised,
  isRightHandRaised,
  areHandsBelowHips,
  areArmsExtendedSideways,
  isHandNearHead,
  areHandsNearFace,
  areHandsNearShoulders,
  isHandNearTorso,
  isHandNearKnees,
  areHandsNearAnkles,
  areHandsNearHips,
  areHandsTouching,
  isArmCrossedAcrossTorso,
  areHandsForward,
  areHandsBehindBack,
  // Static — whole-body posture
  isSquatting,
  isStandingUpright,
  isStarPose,
  // Temporal
  isHandMovingHorizontally,
  isBodyMovingVertically,
  isMarchingInPlace,
  isBodyRotating,
  isSteppingSideways,
  isHeadNoddingVertically,
  isHeadShakingHorizontally,
  isBodyStill,
  isBodyWiggling,
  // Participation
  isChildParticipating,
} from '../validators/primitives';

export type PrimitiveValidatorFn = (pose: PoseFrame, history?: PoseFrame[]) => ValidationResult;

type StaticFn = (pose: PoseFrame) => ValidationResult;
type TemporalFn = (history: PoseFrame[], current?: PoseFrame) => ValidationResult;

/**
 * Validators that report presence and engagement rather than a specific pose.
 * See `isChildParticipating` — MoveNet has no mouth or finger landmarks, so
 * facial expressions and finger gestures cannot be verified. Activities bound to
 * these run as guided imitation. Callers can use this set to phrase feedback
 * honestly instead of implying the pose itself was checked.
 */
export const PARTICIPATION_VALIDATORS: ReadonlySet<string> = new Set(['isChildParticipating']);

export class ValidatorRegistry {
  private validators: Map<string, PrimitiveValidatorFn> = new Map();

  constructor() {
    // --- Static: single frame is enough -----------------------------------
    this.registerStatic('areHandsAboveShoulders', areHandsAboveShoulders);
    this.registerStatic('areBothHandsAboveShoulders', areBothHandsAboveShoulders);
    this.registerStatic('isLeftHandRaised', isLeftHandRaised);
    this.registerStatic('isRightHandRaised', isRightHandRaised);
    this.registerStatic('areHandsBelowHips', areHandsBelowHips);
    this.registerStatic('areArmsExtendedSideways', areArmsExtendedSideways);
    this.registerStatic('isHandNearHead', isHandNearHead);
    this.registerStatic('areHandsNearFace', areHandsNearFace);
    this.registerStatic('areHandsNearShoulders', areHandsNearShoulders);
    this.registerStatic('isHandNearTorso', isHandNearTorso);
    this.registerStatic('isHandNearKnees', isHandNearKnees);
    this.registerStatic('areHandsNearAnkles', areHandsNearAnkles);
    this.registerStatic('areHandsNearHips', areHandsNearHips);
    this.registerStatic('areHandsTouching', areHandsTouching);
    this.registerStatic('isArmCrossedAcrossTorso', isArmCrossedAcrossTorso);
    this.registerStatic('areHandsForward', areHandsForward);
    this.registerStatic('areHandsBehindBack', areHandsBehindBack);
    this.registerStatic('isSquatting', isSquatting);
    this.registerStatic('isStandingUpright', isStandingUpright);
    this.registerStatic('isStarPose', isStarPose);

    // --- Temporal: needs the history window -------------------------------
    this.registerTemporal('isHandMovingHorizontally', isHandMovingHorizontally);
    this.registerTemporal('isBodyMovingVertically', isBodyMovingVertically);
    this.registerTemporal('isMarchingInPlace', isMarchingInPlace);
    this.registerTemporal('isBodyRotating', isBodyRotating);
    this.registerTemporal('isSteppingSideways', isSteppingSideways);
    this.registerTemporal('isHeadNoddingVertically', isHeadNoddingVertically);
    this.registerTemporal('isHeadShakingHorizontally', isHeadShakingHorizontally);
    this.registerTemporal('isBodyStill', isBodyStill);
    this.registerTemporal('isBodyWiggling', isBodyWiggling);

    // --- Participation ----------------------------------------------------
    this.registerTemporal('isChildParticipating', isChildParticipating);
  }

  private registerStatic(name: string, fn: StaticFn): void {
    this.validators.set(name, (pose) => fn(pose));
  }

  private registerTemporal(name: string, fn: TemporalFn): void {
    this.validators.set(name, (pose, history) => fn(history && history.length > 0 ? history : [pose], pose));
  }

  public register(name: string, fn: PrimitiveValidatorFn): void {
    this.validators.set(name, fn);
  }

  public resolveValidator(name: string): PrimitiveValidatorFn | null {
    return this.validators.get(name) || null;
  }

  public hasValidator(name: string): boolean {
    return this.validators.has(name);
  }

  /** Every registered name — used to keep the catalog generator in sync. */
  public listValidators(): string[] {
    return Array.from(this.validators.keys()).sort();
  }

  /** True when this validator checks presence and engagement, not a pose. */
  public isParticipationValidator(name: string): boolean {
    return PARTICIPATION_VALIDATORS.has(name);
  }
}

export const validatorRegistry = new ValidatorRegistry();
