import { describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { DragDropEngine } from '../engine/DragDropEngine';
import { ActivityLoader } from '../engine/ActivityLoader';
import { ActivityRepository, ActivityRepositoryResult } from '../../../core/activity-repository/ActivityRepository';
import { DragDropActivitySpec } from '../types';

class MockTestRepository implements ActivityRepository {
  async getActivityById<T = any>(activityId: string): Promise<ActivityRepositoryResult<T>> {
    const fixturePath = path.resolve(
      __dirname,
      '../../../../../curriculum/activities/drag_drop/pn_animal_babies_3.json'
    );
    if (fs.existsSync(fixturePath)) {
      const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      return { success: true, activity: data as T, source: 'local' };
    }
    throw new Error(`Fixture not found: ${fixturePath}`);
  }

  async getActivityByNodeRef<T = any>(): Promise<ActivityRepositoryResult<T>> {
    return this.getActivityById('pn_animal_babies_3');
  }

  verifyCompatibility(): boolean {
    return true;
  }
}

describe('DragDropEngine Integration Test', () => {
  let engine: DragDropEngine;

  beforeEach(() => {
    const repo = new MockTestRepository();
    const loader = new ActivityLoader(repo);
    engine = new DragDropEngine(loader);
  });

  afterEach(() => {
    engine.dispose();
  });

  test('should load activity fixture, start lifecycle, handle drag & drop, and complete session', async () => {
    const spec = await engine.loadAndPrepare('pn_animal_babies_3');
    expect(spec).toBeDefined();
    expect(spec.draggables.length).toBeGreaterThan(0);
    expect(spec.dropZones.length).toBeGreaterThan(0);

    engine.startActivity();
    expect(engine.lifecycle.getState()).toBe('Running');

    // Simulate drag and drop for item 1 -> zone 1 (accepted)
    const item1 = spec.draggables[0];
    const zone1 = spec.dropZones[0];

    const dropPoint = {
      x: zone1.shape.position.x + 10,
      y: zone1.shape.position.y + 10,
    };

    engine.handleDragStart(item1.id, item1.position.x, item1.position.y);
    engine.handleDragMove(item1.id, dropPoint.x, dropPoint.y);
    const result = engine.handleDragEnd(item1.id, dropPoint);

    expect(result).toBe(true);
    expect(engine.placementState.getItemInZone(zone1.id)).toBe(item1.id);
  });
});
