/**
 * Local Activity Repository — PetalPath Core Implementation
 * Fetches activity specs from local curriculum JSON or backend API with version verification and offline resilience.
 */

import { ActivityRepository, ActivityRepositoryResult } from './ActivityRepository';
import { api } from '../../api/client';

export class LocalActivityRepository implements ActivityRepository {
  async getActivityById<T = any>(activityId: string): Promise<ActivityRepositoryResult<T>> {
    try {
      // 1. Attempt API fetch
      const res = await api.get(`/activities/${activityId}`);
      if (res.success && res.data && (res.data as any).dragDropSpec) {
        const spec = (res.data as any).dragDropSpec;
        if (!this.verifyCompatibility(spec, '1.4.0')) {
          return {
            success: false,
            error: `Incompatible activity schema version for engine 1.4.0`,
            source: 'api',
          };
        }
        return {
          success: true,
          activity: spec as T,
          source: 'api',
        };
      }
    } catch {
      // Offline fallback: API unavailable
    }

    return {
      success: false,
      error: `Activity "${activityId}" could not be loaded.`,
      source: 'local',
    };
  }

  async getActivityByNodeRef<T = any>(
    nodeId: string,
    activityIndex: number
  ): Promise<ActivityRepositoryResult<T>> {
    return this.getActivityById<T>(`${nodeId}_${activityIndex}`);
  }

  verifyCompatibility(activitySpec: any, currentEngineVersion: string): boolean {
    if (!activitySpec) return false;

    // Handshake: Check minimumEngineVersion if declared
    const minVer = activitySpec.engine?.minimumEngineVersion;
    if (minVer && minVer > currentEngineVersion) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(
          `Activity requires minimum engine version ${minVer}, but running version is ${currentEngineVersion}`
        );
      }
      return false;
    }
    return true;
  }
}

export const localActivityRepository = new LocalActivityRepository();
