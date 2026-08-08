/**
 * Drag & Drop Activity Loader — PetalPath Engine Subsystem
 * Fetches, hydrates assets, and prepares runtime-ready activity specs via ActivityRepository.
 */

import { DragDropActivitySpec } from '../types';
import { ActivityRepository } from '../../../core/activity-repository/ActivityRepository';
import { localActivityRepository } from '../../../core/activity-repository/LocalActivityRepository';
import { AssetPreloader } from '../../../core/assets/assetPreloader';

export interface RuntimeReadyActivity {
  spec: DragDropActivitySpec;
  isAssetPreloaded: boolean;
}

export class ActivityLoader {
  constructor(private repo: ActivityRepository = localActivityRepository) {}

  async loadRuntimeReadyActivity(activityId: string): Promise<RuntimeReadyActivity> {
    const result = await this.repo.getActivityById<DragDropActivitySpec>(activityId);

    if (!result.success || !result.activity) {
      throw new Error(result.error || `Failed to load activity "${activityId}".`);
    }

    const spec = result.activity;

    // Preload assets if specified
    let assetsLoaded = true;
    if (spec.assets?.required) {
      assetsLoaded = await AssetPreloader.preloadAssets(spec.assets.required);
    }

    return {
      spec,
      isAssetPreloaded: assetsLoaded,
    };
  }
}
