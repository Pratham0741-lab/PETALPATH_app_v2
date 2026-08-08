import { describe, beforeEach, test, expect } from '@jest/globals';
import { PlacementManager } from '../engine/PlacementManager';
import { DropZone } from '../types';

describe('PlacementManager Subsystem', () => {
  let placementManager: PlacementManager;
  let sampleDropZones: DropZone[];

  beforeEach(() => {
    placementManager = new PlacementManager();
    sampleDropZones = [
      {
        id: 'zone-1',
        shape: {
          type: 'rectangle',
          position: { x: 100, y: 100 },
          dimensions: { width: 150, height: 150 },
        },
        acceptedDraggableIds: ['item-1'],
        capacity: 1,
        sortOrder: 1,
        accessibility: { screenReaderLabel: 'Target 1' },
      },
      {
        id: 'zone-2',
        shape: {
          type: 'circle',
          position: { x: 300, y: 100 },
          dimensions: { width: 100, height: 100 },
        },
        acceptedDraggableIds: ['item-2'],
        capacity: 1,
        sortOrder: 2,
        accessibility: { screenReaderLabel: 'Target 2' },
      },
    ];
  });

  test('should detect collision and snap point inside rectangle drop zone', () => {
    const dropPoint = { x: 120, y: 120 };
    const placement = placementManager.findPlacementTarget(dropPoint, sampleDropZones);

    expect(placement.dropZoneId).toBe('zone-1');
    expect(placement.isSnapped).toBe(true);
    expect(placement.snappedPosition).toEqual({ x: 175, y: 175 });
  });

  test('should detect collision inside circle drop zone', () => {
    const dropPoint = { x: 350, y: 150 };
    const placement = placementManager.findPlacementTarget(dropPoint, sampleDropZones);

    expect(placement.dropZoneId).toBe('zone-2');
    expect(placement.isSnapped).toBe(true);
  });

  test('should return null target when point is far outside snap radius', () => {
    const dropPoint = { x: 800, y: 800 };
    const placement = placementManager.findPlacementTarget(dropPoint, sampleDropZones);

    expect(placement.dropZoneId).toBeNull();
    expect(placement.isSnapped).toBe(false);
  });
});
