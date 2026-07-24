import { PoseFrame, ValidationResult } from '../types/pose.types';
import {
  areHandsAboveShoulders,
  isHandNearHead,
  isHandNearKnees,
  areHandsNearHips,
  areHandsTouching,
  isArmCrossedAcrossTorso,
  isHandMovingHorizontally,
  isBodyMovingVertically,
} from '../validators/primitives';

export type PrimitiveValidatorFn = (pose: PoseFrame, history?: PoseFrame[]) => ValidationResult;

export class ValidatorRegistry {
  private validators: Map<string, PrimitiveValidatorFn> = new Map();

  constructor() {
    this.register('areHandsAboveShoulders', (p) => areHandsAboveShoulders(p));
    this.register('isHandNearHead', (p) => isHandNearHead(p));
    this.register('isHandNearKnees', (p) => isHandNearKnees(p));
    this.register('areHandsNearHips', (p) => areHandsNearHips(p));
    this.register('areHandsTouching', (p) => areHandsTouching(p));
    this.register('isArmCrossedAcrossTorso', (p) => isArmCrossedAcrossTorso(p));
    this.register('isHandMovingHorizontally', (p, h) => isHandMovingHorizontally(h || [p]));
    this.register('isBodyMovingVertically', (p, h) => isBodyMovingVertically(h || [p]));
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
}

export const validatorRegistry = new ValidatorRegistry();
