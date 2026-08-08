/**
 * Activity Lifecycle State Machine — PetalPath Core
 */

export type ActivityLifecycleState =
  | 'Initializing'
  | 'Loading'
  | 'Ready'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Disposed';

export type LifecycleListener = (
  newState: ActivityLifecycleState,
  previousState: ActivityLifecycleState
) => void;

export class ActivityLifecycle {
  private currentState: ActivityLifecycleState = 'Initializing';
  private listeners: Set<LifecycleListener> = new Set();

  getState(): ActivityLifecycleState {
    return this.currentState;
  }

  transitionTo(newState: ActivityLifecycleState): void {
    if (this.currentState === newState || this.currentState === 'Disposed') {
      return;
    }
    const oldState = this.currentState;
    this.currentState = newState;
    this.listeners.forEach((listener) => {
      try {
        listener(newState, oldState);
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.error(`Error in lifecycle listener transition ${oldState} -> ${newState}:`, err);
        }
      }
    });
  }

  onStateChange(listener: LifecycleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    this.transitionTo('Disposed');
    this.listeners.clear();
  }
}
