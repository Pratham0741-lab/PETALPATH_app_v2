export type CameraAnalyticsEvent =
  | 'activity_started'
  | 'activity_completed'
  | 'activity_timed_out'
  | 'activity_cancelled'
  | 'offline_sync_success'
  | 'offline_sync_failed';

export class CameraAnalytics {
  public logEvent(event: CameraAnalyticsEvent, payload?: Record<string, any>): void {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`[CameraAnalytics] ${event}`, payload ?? '');
    }
  }
}

export const cameraAnalytics = new CameraAnalytics();
