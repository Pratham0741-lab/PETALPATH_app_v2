/**
 * Activity Repository Abstraction — PetalPath Core Data Layer
 * Handles data access for activity specs with schema version compatibility verification.
 */

export interface ActivityRepositoryResult<T = any> {
  success: boolean;
  activity?: T;
  error?: string;
  source: 'local' | 'api' | 'cache';
}

export interface ActivityRepository {
  getActivityById<T = any>(activityId: string): Promise<ActivityRepositoryResult<T>>;
  getActivityByNodeRef<T = any>(
    nodeId: string,
    activityIndex: number
  ): Promise<ActivityRepositoryResult<T>>;
  verifyCompatibility(activitySpec: any, currentEngineVersion: string): boolean;
}
