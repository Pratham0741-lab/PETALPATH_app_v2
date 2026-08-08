import { describe, beforeEach, test, expect } from '@jest/globals';
import { ValidationSystem } from '../engine/ValidationSystem';
import { ValidationConfig, DropZone } from '../types';

describe('ValidationSystem Subsystem', () => {
  let validator: ValidationSystem;
  let sampleDropZones: DropZone[];

  beforeEach(() => {
    validator = new ValidationSystem();
    sampleDropZones = [
      {
        id: 'zone-1',
        shape: { type: 'rectangle', position: { x: 0, y: 0 }, dimensions: { width: 100, height: 100 } },
        acceptedDraggableIds: ['item-1', 'item-2'],
        capacity: 2,
        sortOrder: 1,
        accessibility: { screenReaderLabel: 'Zone 1' },
      },
    ];
  });

  test('should validate correct items in many-to-one strategy', () => {
    const config: ValidationConfig = {
      strategy: 'many-to-one',
      evaluationTiming: 'on-drop',
      allowRetries: true,
      maxAttempts: 0,
      scoringModel: { type: 'per-item', starThresholds: { oneStar: 0.4, twoStars: 0.7, threeStars: 0.9 } },
    };

    const res1 = validator.evaluateDrop('item-1', 'zone-1', config, sampleDropZones, {});
    expect(res1.isValid).toBe(true);

    const res2 = validator.evaluateDrop('invalid-item', 'zone-1', config, sampleDropZones, {});
    expect(res2.isValid).toBe(false);
  });

  test('should validate sequence in ordered-sequence strategy', () => {
    const config: ValidationConfig = {
      strategy: 'ordered-sequence',
      evaluationTiming: 'on-drop',
      allowRetries: true,
      maxAttempts: 0,
      orderedSequence: ['item-1', 'item-2', 'item-3'],
      scoringModel: { type: 'per-item', starThresholds: { oneStar: 0.4, twoStars: 0.7, threeStars: 0.9 } },
    };

    // First item expected: 'item-1'
    const res1 = validator.evaluateDrop('item-1', 'zone-1', config, sampleDropZones, {});
    expect(res1.isValid).toBe(true);

    // Second item expected when 1 item already placed: 'item-2'
    const res2 = validator.evaluateDrop('item-3', 'zone-1', config, sampleDropZones, { 'zone-1': 'item-1' });
    expect(res2.isValid).toBe(false);
  });

  test('should support custom validator functions', () => {
    const config: ValidationConfig = {
      strategy: 'custom',
      customValidatorId: 'even-numbers-only',
      evaluationTiming: 'on-drop',
      allowRetries: true,
      maxAttempts: 0,
      scoringModel: { type: 'per-item', starThresholds: { oneStar: 0.4, twoStars: 0.7, threeStars: 0.9 } },
    };

    validator.registerCustomValidator('even-numbers-only', (itemId) => itemId === 'item-2');

    const res1 = validator.evaluateDrop('item-2', 'zone-1', config, sampleDropZones, {});
    expect(res1.isValid).toBe(true);

    const res2 = validator.evaluateDrop('item-1', 'zone-1', config, sampleDropZones, {});
    expect(res2.isValid).toBe(false);
  });
});
